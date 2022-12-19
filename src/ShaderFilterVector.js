import { ShaderFilter } from './ShaderFilter.js'

// vector field https://www.shadertoy.com/view/4s23DG
// isolines https://www.shadertoy.com/view/Ms2XWc

class ShaderFilterVector extends ShaderFilter {
    constructor(colorscale, options) {
        super(options);
        options = Object.assign({
            inDomain: [],
            maxSteps: 256,
            resolution: [1.0, 1.0]
        }, options);
        Object.assign(this, options);

        if(this.inDomain.length != 2 && this.inDomain[1] <= this.inDomain[0]) {
            throw Error("inDomain bad format");
        }

        this.colorscale = colorscale;
        if (this.inDomain.length == 0) this.inDomain = this.colorscale.rangeDomain();

        const cscaleDomain = this.colorscale.rangeDomain();

        const scale = Math.sqrt((this.inDomain[1]*this.inDomain[1]+this.inDomain[0]*this.inDomain[0])/(cscaleDomain[1]*cscaleDomain[1]+cscaleDomain[0]*cscaleDomain[0]));
        const bias = 0.0;

        console.log("scale bias ", scale, bias);
        this.samplers = [{ name:`${this.samplerName('colormap')}` }];

        this.uniforms[this.uniformName('low_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.lowColor.value() };
        this.uniforms[this.uniformName('high_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.highColor.value() };
        this.uniforms[this.uniformName('indomain')] = { type: 'vec2', needsUpdate: true, size: 2, value: this.inDomain };
        this.uniforms[this.uniformName('scale')] = { type: 'float', needsUpdate: true, size: 1, value: scale };
        this.uniforms[this.uniformName('bias')] = { type: 'float', needsUpdate: true, size: 1, value: bias };
        this.uniforms[this.uniformName('resolution')] = { type: 'vec2', needsUpdate: true, size: 2, value: this.resolution };

    }

    createTextures(gl) {       
        const colormap = this.colorscale.sample(this.maxSteps);
        let textureFilter=gl.LINEAR;
        if(this.colorscale.type == 'bar') {
            textureFilter=gl.NEAREST;
        }
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureFilter);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.maxSteps, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, colormap.buffer);
        this.getSampler('colormap').tex = tex; // Link tex to sampler
    }

    fragDataSrc(gl) {
        return `
        // 2D vector field visualization by Matthias Reitinger, @mreitinger
        // Based on "2D vector field visualization by Morgan McGuire, http://casual-effects.com", https://www.shadertoy.com/view/4s23DG
        
        const float ARROW_TILE_SIZE = 24.0;
        
        // Computes the center pixel of the tile containing pixel pos
        vec2 arrowTileCenterCoord(vec2 pos) {
            return (floor(pos / ARROW_TILE_SIZE) + 0.5) * ARROW_TILE_SIZE;
        }
        
        float line3(vec2 a, vec2 b, vec2 c) {
            vec2 ab = a - b;
            vec2 cb = c - b;
            float d = dot(ab, cb);
            float len = length(cb);
            float t = 0.0;
            if (len != 0.0) {
              t = clamp(d / (len * len), 0.0, 1.0);
            }
            vec2 r = b + cb * t;
            return distance(a, r);
          }

        float line2(vec2 p, vec2 v, vec2 w) {
            // Return minimum distance between line segment vw and point p
            float l2 = length(w-v);  // i.e. |w-v|^2 -  avoid a sqrt
            if (l2 == 0.0) return distance(p, v);   // v == w case
            // Consider the line extending the segment, parameterized as v + t (w - v).
            // We find projection of point p onto the line. 
            // It falls where t = [(p-v) . (w-v)] / |w-v|^2
            // We clamp t from [0,1] to handle points outside the segment vw.
            float t = max(0.0, min(1.0, dot(p - v, w - v) / l2));
            vec2 projection = v + t * (w - v);  // Projection falls on the segment
            return distance(p, projection);
        }

        // Computes the signed distance from a line segment
        float line(vec2 p, vec2 p1, vec2 p2) {
            vec2 center = (p1 + p2) * 0.5;
            float len = length(p2 - p1);
            vec2 dir = (p2 - p1) / len;
            vec2 rel_p = p - center;
            float dist1 = abs(dot(rel_p, vec2(dir.y, -dir.x)));
            float dist2 = abs(dot(rel_p, dir)) - 0.5*len;
            return max(dist1, dist2);
        }
        
        // v = field sampled at arrowTileCenterCoord(p), scaled by the length
        // desired in pixels for arrows
        // Returns a signed distance from the arrow
        float arrow(vec2 p, vec2 v) {
            v *= ARROW_TILE_SIZE * 0.5; // Change from [0,1] to pixels
            // Make everything relative to the center, which may be fractional
            p -= arrowTileCenterCoord(p);
                
            float mag_v = length(v), mag_p = length(p);
            
            if (mag_v > 0.0) {
                // Non-zero velocity case
                vec2 dir_v = normalize(v);
                
                // We can't draw arrows larger than the tile radius, so clamp magnitude.
                // Enforce a minimum length to help see direction
                mag_v = clamp(mag_v, 2.0, ARROW_TILE_SIZE * 0.4);
        
                // Arrow tip location
                v = dir_v * mag_v;
        
                // Signed distance from shaft
                float shaft = line3(p, v, -v);
                // Signed distance from head
                float head = min(line3(p, v, 0.4*v + 0.2*vec2(-v.y, v.x)),
                                 line3(p, v, 0.4*v + 0.2*vec2(v.y, -v.x)));
                return min(shaft, head);
            } else {
                // Signed distance from the center point
                return mag_p;
            }
        }
        
        vec4 ${this.functionName()}(vec4 col){
            if(col.a == 0.0) return col;

            vec2 indomain = ${this.uniformName('indomain')};
            vec2 p = v_texcoord*${this.uniformName('resolution')};
            vec2 pc_coord = arrowTileCenterCoord(p)/${this.uniformName('resolution')};
            vec4 pc_val = texture(kd, pc_coord); // [0..1]
            float s = 2.0;
            float b = 2.0*indomain[0]/(indomain[1]-indomain[0]);
            vec2 uv = vec2(pc_val.x*s+b, pc_val.y*s+b); // [-1..1]
 
            // Colors
            float v = length(uv);
            float cv = v*${this.uniformName('scale')} + ${this.uniformName('bias')};
            vec4 cmap = vec4(1.0);
                
            if(cv >= 1.0) 
                cmap = ${this.uniformName('high_color')};
            else if(cv <= 0.0) 
                cmap = ${this.uniformName('low_color')};
            else
                cmap = texture(${this.samplerName('colormap')}, vec2(cv, 0.5));

            // Arrow            
            float arrow_dist = arrow(p, uv);
            
            vec4 arrow_col = cmap;
            vec4 field_col = vec4(0.0);
            float t = clamp(arrow_dist, 0.0, 1.0);
            return  mix(arrow_col, field_col, t);
        }`;
    }


}


export { ShaderFilterVector }