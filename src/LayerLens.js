import {LayerCombiner}  from './LayerCombiner.js'
import {Lens}           from './Lens.js'
import {ShaderLens}     from './ShaderLens.js'
import {ControllerLens} from './ControllerLens.js'
import {Layout}         from './Layout.js'

/**
 * options must contain one layer and lens = {x:, y:, r:, border: }
 */
class LayerLens extends LayerCombiner {
	constructor(options) {
        super(options);
        
        if (!this.lens) {
            throw "LayerLens option lens required";
        }

        if (!this.camera) {
            throw "LayerLens option camera required";
        }
        
        let shader = new ShaderLens({
            'lens': this.lens,
            'camera': this.camera,
            'samplers': [ { id:0, name: 'source0'} ]
        });
        this.shaders['lens'] = shader;
		this.setShader('lens');

        let controller = new ControllerLens((lensVec)=>shader.setLensVector(lensVec), 
                                            { hover: true, 
                                              lens: this.lens,
                                              camera: this.camera});
        this.controllers.push(controller);
    }

    draw(transform, vieport) {
        this.shader.updateLensUniform();
        super.draw(transform, vieport);
    }
}

export {LayerLens}