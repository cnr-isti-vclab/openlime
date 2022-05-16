import { LayerAnnotation } from './LayerAnnotation.js'
import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'
import { LayoutTileImages } from './LayoutTileImages.js';

/**
 * Class which extend LayerAnnotation. Support Image Annotations.
 * Each annotation corresponds to a tile (currently single resolution)
 */

class LayerAnnotationImage extends LayerAnnotation {
    constructor(options) {
        if (options.path == null) {
            console.log("WARNING MISSING ANNOTATION PATH, SET TO ./annot/");
        }
        super(options);
        const path = options.path != null ? options.path : "./annot";
        const rasterFormat = this.format != null ? this.format : 'vec4';

        let initCallback = () => {
            // Set in layout urls, and annotation locations (x,y,w,h)
            let urls = [];
            let locations = [];
            for(let a of this.annotations) {
                // if(a.publish != 1)
                const url = options.path + "/" + a.imageUrl;
                urls.push(url);
                locations.push(a.state.location);
                let raster = new Raster({ format: rasterFormat });
                this.rasters.push(raster);
            }
            
            this.layout.setUrls(urls);
            this.layout.setTileLocations(locations);
            console.log("URLS: " + urls);
            console.log("LOCATIONS: ");
            console.log(locations);

            this.setupShader(rasterFormat);
        }
        this.addEvent('loaded', initCallback);
        
        let updateCallback = () => {
            const N = this.annotations.length;
            for(let i = 0; i < N; ++i) {
                let a = this.annotations[i];
                this.layout.setActiveTile(i, a.visible);
            }
        }
        this.addEvent('update', updateCallback);

    }

    length() {
        return this.annotations.length;
    }

    setActiveTile(index) {
        console.log("Set Active tile " + index);
        this.layout.setActiveAllTiles(false);
        this.layout.setActiveTile(index, true);
        this.emit('update');
    }

    drawTile(tile) {
		if (tile.missing != 0)
			throw "Attempt to draw tile still missing textures"

        const idx = tile.index;
		let c = this.layout.tileCoords(tile);

		//update coords and texture buffers
		this.updateTileBuffers(c.coords, c.tcoords);

		//bind texture of this tile only (each tile corresponds to an image)
		let gl = this.gl;
		let id = this.shader.samplers[idx].id;
		gl.uniform1i(this.shader.samplers[idx].location, idx);
		gl.activeTexture(gl.TEXTURE0 + idx);
		gl.bindTexture(gl.TEXTURE_2D, tile.tex[id]);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	}

    setupShader(rasterFormat) {
        let samplers = [];
        let N = this.rasters.length;
        for(let i = 0; i < N; ++i) {
            samplers.push({id:i, name: 'kd', type: rasterFormat});
        }
		let shader = new Shader({
			'label': 'Rgb',
			'samplers': samplers //[{ id:0, name:'kd', type: rasterFormat }]
		});
		
		shader.fragShaderSrc = function(gl) {

			let gl2 = !(gl instanceof WebGLRenderingContext);
			let str = `${gl2? '#version 300 es' : ''}

precision highp float;
precision highp int;

uniform sampler2D kd;

${gl2? 'in' : 'varying'} vec2 v_texcoord;
${gl2? 'out' : ''} vec4 color;


void main() {
	color = texture${gl2?'':'2D'}(kd, v_texcoord);
	${gl2? '':'gl_FragColor = color;'}
}
`;
			return str;

		};

		this.shaders = {'standard': shader };
		this.setShader('standard');
    }

}

Layer.prototype.types['annotation_image'] = (options) => { return new LayerAnnotationImage(options); }

export { LayerAnnotationImage }