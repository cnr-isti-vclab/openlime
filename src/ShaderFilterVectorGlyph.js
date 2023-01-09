import { Color } from './Colormap.js';
import { ShaderFilter } from './ShaderFilter.js'
import { Util } from './Util'

// vector field https://www.shadertoy.com/view/4s23DG
// isolines https://www.shadertoy.com/view/Ms2XWc

class ShaderFilterVectorGlyph extends ShaderFilter {
    constructor(colorscale, glyphsUrl, options) {
        super(options);
        options = Object.assign({
            inDomain: [],
            maxSteps: 256,
            glyphColor: [0.0, 0.0, 0.0, 1.0],
            glyphsStride: 80,
            glyphsSize: [304, 64]
        }, options);
        Object.assign(this, options);

        if (this.inDomain.length != 2 && this.inDomain[1] <= this.inDomain[0]) {
            throw Error("inDomain bad format");
        }

        this.glyphsUrl = glyphsUrl;
        if (this.glyphsUrl.length == 0) throw Error("glyphUrl is empty: no items to display");

        this.colorscale = colorscale;
        if (this.inDomain.length == 0) this.inDomain = this.colorscale.rangeDomain();

        const cscaleDomain = this.colorscale.rangeDomain();

        const scale = Math.sqrt((this.inDomain[1] * this.inDomain[1] + this.inDomain[0] * this.inDomain[0]) / (cscaleDomain[1] * cscaleDomain[1] + cscaleDomain[0] * cscaleDomain[0]));
        const bias = 0.0;

        const gap = this.glyphsStride-this.glyphsSize[1];
        const glyphCount = Math.round((this.glyphsSize[0] + gap) / this.glyphsStride);

        this.modes = {
            normalize: [
                { id: 'off', enable: true, src: `const bool ${this.modeName('glyphNormalize')} = false;` },
                { id: 'on', enable: false, src: `const bool ${this.modeName('glyphNormalize')} = true;` }
            ],
            glyph: [
                { id: 'mag', enable: true, src: `const int ${this.modeName('glyphColor')} = 0;` },
                { id: 'col', enable: false, src: `const int ${this.modeName('glyphColor')} = 1;` }
            ],
            field: [
                { id: 'none', enable: true, src: `const int ${this.modeName('fieldColor')} = 0;` },
                { id: 'mag', enable: false, src: `const int ${this.modeName('fieldColor')} = 1;` }
            ]
        };

        this.samplers = [{ name: `${this.samplerName('colormap')}` }, { name: `${this.samplerName('glyphs')}` }];


        this.uniforms[this.uniformName('glyph_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.glyphColor };
        this.uniforms[this.uniformName('glyph_count')] = { type: 'float', needsUpdate: true, size: 1, value: glyphCount };
        this.uniforms[this.uniformName('glyph_wh')] = { type: 'float', needsUpdate: true, size: 1, value: this.glyphsSize[1] };
        this.uniforms[this.uniformName('glyph_stride')] = { type: 'float', needsUpdate: true, size: 1, value: this.glyphsStride };

        this.uniforms[this.uniformName('low_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.lowColor.value() };
        this.uniforms[this.uniformName('high_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.highColor.value() };
        this.uniforms[this.uniformName('scale')] = { type: 'float', needsUpdate: true, size: 1, value: scale };
        this.uniforms[this.uniformName('bias')] = { type: 'float', needsUpdate: true, size: 1, value: bias };
    }

    async createTextures(gl) {
        // Glyphs
        const glyphsBuffer = await Util.rasterizeSVG(this.glyphsUrl, this.glyphsSize);
        const glyphsTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glyphsTex);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphsBuffer);
        this.getSampler('glyphs').tex = glyphsTex;

        // Colormap
        const colormap = this.colorscale.sample(this.maxSteps);
        let textureFilter = gl.LINEAR;
        if (this.colorscale.type == 'bar') {
            textureFilter = gl.NEAREST;
        }
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureFilter);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.maxSteps, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, colormap.buffer);
        this.getSampler('colormap').tex = tex;
    }

    fragDataSrc(gl) {
        return `
        // 2D vector glyph visualization
        
        const float GLYPH_TILE_SIZE = 16.0;
        const float ISQRT2 = 0.70710678118; // 1/sqrt(2)

        // Computes the center pixel of the tile containing pixel pos
        vec2 glyphTileCenterCoord(vec2 pos) {
            return (floor(pos / GLYPH_TILE_SIZE) + 0.5) * GLYPH_TILE_SIZE;
        }

        float glyph(vec2 p, vec2 v) {
            if (${this.modeName('glyphNormalize')}) v = normalize(v);
            
            // Make everything relative to the center, which may be fractional
            p -= glyphTileCenterCoord(p);
                
            float mag_v = length(v), mag_p = length(p);
            
            if (mag_v > 0.0) {
                // Non-zero velocity case
                vec2 dir_v = normalize(v);
                
                float level = floor((1.0-mag_v*ISQRT2) * ${this.uniformName('glyph_count')});
                level = min(level, ${this.uniformName('glyph_count')} - 1.0);

                mat2 rotm = mat2(
                    dir_v[1], dir_v[0], // first column
                    -dir_v[0], dir_v[1]  // second column
                );
            
                float scaleToGlyph =  ${this.uniformName('glyph_wh')} / GLYPH_TILE_SIZE;
                vec2 pp = rotm * p; // p on axys with origin in tile center and aligned with direction dir_v
                pp += vec2(GLYPH_TILE_SIZE * 0.5, GLYPH_TILE_SIZE * 0.5); // pp in [0, GLYPH_TILE_SIZE]
                pp *= scaleToGlyph; // pp in [0, glyph_wh]
                pp.x += level * ${this.uniformName('glyph_stride')}; // apply stride
                pp.y = ${this.uniformName('glyph_wh')} - pp.y - 1.0; // invert y-axis
                //vec4 g = texelFetch(${this.samplerName('glyphs')}, ivec2(pp), 0);
                float w = ${this.uniformName('glyph_stride')}*(${this.uniformName('glyph_count')} -1.0) + ${this.uniformName('glyph_wh')};
                float h = ${this.uniformName('glyph_wh')};
                vec2 ppnorm = pp/vec2(w,h);
                vec4 g = texture(${this.samplerName('glyphs')}, ppnorm);
                return 1.0-g.a;

            } else {
                // Signed distance from the center point
                return mag_p;
            }
        }
        
        vec4 lookupColormap(float cv) {            
            if(cv >= 1.0) 
                return ${this.uniformName('high_color')};
            else if(cv <= 0.0) 
                return ${this.uniformName('low_color')};
            return texture(${this.samplerName('colormap')}, vec2(cv, 0.5));
        }

        vec4 ${this.functionName()}(vec4 col){
            if(col.a == 0.0) return col;

            vec2 p = v_texcoord*tileSize; // point in pixel
            vec2 pc_coord = glyphTileCenterCoord(p)/tileSize; // center coordinate
            vec4 pc_val = texture(kd, pc_coord); // [0..1] - lookup color in center
            float s = 2.0;
            float b = -1.0;
            vec2 uvc = vec2(pc_val.x*s+b, pc_val.y*s+b); // [-1..1]
            vec2 uvr =  vec2(col.r*s+b, col.g*s+b); // [-1..1]

            // Colors
            float vc = length(uvc)*ISQRT2;
            float cvc = vc*${this.uniformName('scale')} + ${this.uniformName('bias')};
            float vr = length(uvr)*ISQRT2;
            float cvr = vr*${this.uniformName('scale')} + ${this.uniformName('bias')};
            vec4 cmapc = lookupColormap(cvc);
            vec4 cmapr = lookupColormap(cvr);
                
            // Glyph            
            float glyph_dist = glyph(p, uvc);

            vec4 glyph_col = cmapc;
            vec4 field_col = vec4(0.0, 0.0, 0.0, 0.0);

            switch (${this.modeName('glyphColor')}) {
                case 0:
                    glyph_col = cmapc;
                    break;
                case 1:
                    glyph_col = ${this.uniformName('glyph_color')};               
                    break;
            }

            switch (${this.modeName('fieldColor')}) {
                case 0:
                    field_col = vec4(0.0, 0.0, 0.0, 0.0);
                    break;
                case 1:
                    field_col = cmapr;              
                    break;
            }

            float t = clamp(glyph_dist, 0.0, 1.0);
            return  mix(glyph_col, field_col, t);
        }`;
    }


}


export { ShaderFilterVectorGlyph }