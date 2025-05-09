import { addSignals } from './Signals.js'
import { Util } from './Util.js'

/**
* @typedef {Object} Shader~Sampler
* A reference to a 2D texture used in the shader.
* @property {number} id - Unique identifier for the sampler
* @property {string} name - Sampler variable name in shader program (e.g., "kd" for diffuse texture)
* @property {string} label - Display label for UI/menus
* @property {Array<Object>} samplers - Array of raster definitions
* @property {number} samplers[].id - Raster identifier
* @property {string} samplers[].type - Raster type (e.g., 'color', 'normal')
* @property {boolean} [samplers[].bind=true] - Whether sampler should be bound in prepareGL
* @property {boolean} [samplers[].load=true] - Whether sampler should load from raster
* @property {Array<Object>} uniforms - Shader uniform variables
* @property {string} uniforms[].type - Data type ('vec4'|'vec3'|'vec2'|'float'|'int')
* @property {boolean} uniforms[].needsUpdate - Whether uniform needs GPU update
* @property {number} uniforms[].value - Uniform value or array of values
*/

/**
 * Shader module provides WebGL shader program management for OpenLIME.
 * Supports WebGL 2.0/3.0 GLSL specifications.
 * 
 * Shader class manages WebGL shader programs.
 * Features:
 * - GLSL/ES 3.0 support
 * - Automatic uniform management
 * - Multiple shader modes
 * - Filter pipeline
 */
class Shader {
	/**
	 * Creates a new Shader instance.
	 * @param {Object} [options] - Configuration options
	 * @param {Array<Shader~Sampler>} [options.samplers=[]] - Texture sampler definitions
	 * @param {Object.<string,Object>} [options.uniforms={}] - Shader uniform variables
	 * @param {string} [options.label=null] - Display label for the shader
	 * @param {Array<string>} [options.modes=[]] - Available shader modes
	 * @param {boolean} [options.debug=false] - Enable debug output
	 * @param {boolean} [options.isLinear=false] - Whether the shader works in linear color space
	 * @param {boolean} [options.isSrgbSimplified=true] - Use simplified gamma 2.2 conversion instead of IEC standard
	 * @fires Shader#update
	 */
	constructor(options) {
		options = Object.assign({
			isLinear: false,
			isSrgbSimplified: true
		}, options);
		Object.assign(this, {
			debug: false,
			samplers: [],
			uniforms: {},
			label: null,
			program: null,      //webgl program
			modes: [],
			mode: null, // The current mode
			needsUpdate: true,
			autoSamplerDeclaration: true,
			tileSize: [0, 0]
		});
		addSignals(Shader, 'update');
		Object.assign(this, options);
		this.filters = [];
	}

	/**
	 * Clears all filters from the shader pipeline.
	 * @fires Shader#update
	 */
	clearFilters() {
		this.filters = [];
		this.needsUpdate = true;
		this.emit('update');
	}

	/**
	 * Adds a filter to the shader pipeline.
	 * @param {Object} filter - Filter to add
	 * @fires Shader#update
	 */
	addFilter(f) {
		f.shader = this;
		this.filters.push(f);
		this.needsUpdate = true;
		f.needsUpdate = true;
		this.emit('update');
	}

	/**
	 * Removes a filter from the pipeline by name.
	 * @param {string} name - Name of filter to remove
	 * @fires Shader#update
	 */
	removeFilter(name) {
		this.filters = this.filters.filter((v) => {
			return v.name != name;
		});
		this.needsUpdate = true;
		this.emit('update');
	}

	/**
	 * Sets the current shader mode.
	 * @param {string} mode - Mode identifier (must be in options.modes)
	 * @throws {Error} If mode is not recognized
	 */
	setMode(mode) {
		if (this.modes.indexOf(mode) == -1)
			throw Error("Unknown mode: " + mode);
		this.mode = mode;
		this.needsUpdate = true;
	}

	/**
	 * Restores WebGL state after context loss.
	 * @param {WebGL2RenderingContext} gl - WebGL2 context
	 * @private
	 */
	restoreWebGL(gl) {
		this.createProgram(gl);
	}

	/**
	 * Sets tile dimensions for shader calculations.
	 * @param {number[]} size - [width, height] of tile in pixels
	 * @fires Shader#update
	 */
	setTileSize(sz) {
		this.tileSize = sz;
		this.needsUpdate = true;
	}

	/**
	 * Sets a uniform variable value.
	 * @param {string} name - Uniform variable name
	 * @param {number|boolean|Array} value - Value to set
	 * @throws {Error} If uniform doesn't exist
	 * @fires Shader#update
	 */
	setUniform(name, value) {
		/**
		* The event is fired when a uniform shader variable is changed.
		* @event Camera#update
		*/
		let u = this.getUniform(name);
		if (!u)
			throw new Error(`Unknown '${name}'. It is not a registered uniform.`);
		if ((typeof (value) == "number" || typeof (value) == "boolean") && u.value == value)
			return;
		if (Array.isArray(value) && Array.isArray(u.value) && value.length == u.value.length) {
			let equal = true;
			for (let i = 0; i < value.length; i++)
				if (value[i] != u.value[i]) {
					equal = false;
					break;
				}
			if (equal)
				return;
		}

		u.value = value;
		u.needsUpdate = true;
		this.emit('update');
	}

	/**
	 * Builds complete fragment shader source with all necessary components.
	 * Includes GLSL version, precision statements, conversion functions,
	 * and incorporates filters.
	 * @param {WebGL2RenderingContext} gl - WebGL2 context
	 * @returns {string} Complete fragment shader source code
	 * @private
	 */
	completeFragShaderSrc(gl) {
		let src = '#version 300 es\n';
		src += `precision highp float;\n`;
		src += `precision highp int;\n`;
		src += `const vec2 tileSize = vec2(${this.tileSize[0]}.0, ${this.tileSize[1]}.0);\n`;

		// Choose between simplified (gamma 2.2) or standard IEC 61966-2-1 conversion
		if (this.isSrgbSimplified) {
			src += `
// Simplified sRGB to linear conversion using gamma 2.2
// Convert from sRGB to linear RGB
vec3 srgb2linear(vec3 srgb) {
    return pow(srgb, vec3(2.2));
}

// Convert from sRGB to linear RGB (vec4 version - preserves alpha)
vec4 srgb2linear(vec4 srgb) {
    return vec4(srgb2linear(srgb.rgb), srgb.a);
}

// Convert a single sRGB channel to linear
float srgb2linear(float c) {
    return pow(c, 2.2);
}

// Simplified linear to sRGB conversion using gamma 1/2.2
// Convert from linear RGB to sRGB
vec3 linear2srgb(vec3 linear) {
    return pow(linear, vec3(1.0/2.2));
}

// Convert from linear RGB to sRGB (vec4 version - preserves alpha)
vec4 linear2srgb(vec4 linear) {
    return vec4(linear2srgb(linear.rgb), linear.a);
}

// Convert a single linear channel to sRGB
float linear2srgb(float c) {
    return pow(c, 1.0/2.2);
}
`;
		} else {
			src += `
// IEC 61966-2-1 specification		
// Convert from sRGB to linear RGB
vec3 srgb2linear(vec3 srgb) {
    bvec3 cutoff = lessThan(srgb, vec3(0.04045));
    vec3 higher = pow((srgb + vec3(0.055))/vec3(1.055), vec3(2.4));
    vec3 lower = srgb/vec3(12.92);
    
    return mix(higher, lower, cutoff);
}

// Convert from sRGB to linear RGB (vec4 version - preserves alpha)
vec4 srgb2linear(vec4 srgb) {
    return vec4(srgb2linear(srgb.rgb), srgb.a);
}

// Convert a single sRGB channel to linear
float srgb2linear(float c) {
    return c <= 0.04045 ? c/12.92 : pow((c + 0.055)/1.055, 2.4);
}

// IEC 61966-2-1 specification
// Convert from linear RGB to sRGB
vec3 linear2srgb(vec3 linear) {
    bvec3 cutoff = lessThan(linear, vec3(0.0031308));
    vec3 higher = vec3(1.055) * pow(linear, vec3(1.0/2.4)) - vec3(0.055);
    vec3 lower = linear * vec3(12.92);
    
    return mix(higher, lower, cutoff);
}

// Convert from linear RGB to sRGB (vec4 version - preserves alpha)
vec4 linear2srgb(vec4 linear) {
    return vec4(linear2srgb(linear.rgb), linear.a);
}

// Convert a single linear channel to sRGB
float linear2srgb(float c) {
    return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0/2.4) - 0.055;
}
`;
		}

		if (this.autoSamplerDeclaration) {
			for (let sampler of this.samplers) {
				src += `uniform sampler2D ${sampler.name};\n`;
			}

			for (let sampler of this.samplers) {
				src += `uniform bool ${sampler.name}_isLinear;\n`;
			}
		}

		src += this.fragShaderSrc() + '\n';

		for (let f of this.filters) {
			src += `		// Filter: ${f.name}\n`;
			src += f.fragModeSrc() + '\n';
			src += f.fragSamplerSrc() + '\n';
			src += f.fragUniformSrc() + '\n';
			src += f.fragDataSrc() + '\n\n';
		}

		src += `
	out vec4 color;
	void main() { 
		color = data();
		`;
		for (let f of this.filters) {
			src += `color=${f.functionName()}(color);\n`
		}
		src += `}`;
		return src;
	}

	/**
	 * Creates the WebGL shader program.
	 * @param {WebGL2RenderingContext} gl - WebGL2 context
	 * @private
	 * @throws {Error} If shader compilation or linking fails
	 */
	createProgram(gl) {
		let vert = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vert, this.vertShaderSrc(gl));

		gl.compileShader(vert);
		let compiled = gl.getShaderParameter(vert, gl.COMPILE_STATUS);
		if (!compiled) {
			Util.printSrcCode(this.vertShaderSrc(gl))
			console.log(gl.getShaderInfoLog(vert));
			throw Error("Failed vertex shader compilation: see console log and ask for support.");
		} else if (this.debug) {
			console.log("here");
			Util.printSrcCode(this.vertShaderSrc(gl));
		}

		let frag = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(frag, this.completeFragShaderSrc(gl));
		gl.compileShader(frag);

		if (this.program)
			gl.deleteProgram(this.program);

		let program = gl.createProgram();

		gl.getShaderParameter(frag, gl.COMPILE_STATUS);
		compiled = gl.getShaderParameter(frag, gl.COMPILE_STATUS);
		if (!compiled) {
			Util.printSrcCode(this.completeFragShaderSrc(gl));
			console.log(gl.getShaderInfoLog(frag));
			throw Error("Failed fragment shader compilation: see console log and ask for support.");
		} else if (this.debug) {
			Util.printSrcCode(this.completeFragShaderSrc(gl));
		}
		gl.attachShader(program, vert);
		gl.attachShader(program, frag);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			var info = gl.getProgramInfoLog(program);
			throw new Error('Could not compile WebGL program. \n\n' + info);
		}

		//sampler units;
		for (let sampler of this.samplers)
			sampler.location = gl.getUniformLocation(program, sampler.name);

		// filter samplers
		for (let f of this.filters)
			for (let sampler of f.samplers)
				sampler.location = gl.getUniformLocation(program, sampler.name);

		this.coordattrib = gl.getAttribLocation(program, "a_position");
		gl.vertexAttribPointer(this.coordattrib, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.coordattrib);

		this.texattrib = gl.getAttribLocation(program, "a_texcoord");
		gl.vertexAttribPointer(this.texattrib, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.texattrib);

		this.matrixlocation = gl.getUniformLocation(program, "u_matrix");

		this.program = program;
		this.needsUpdate = false;

		for (let uniform of Object.values(this.allUniforms())) {
			uniform.location = null;
			uniform.needsUpdate = true;
		}

		for (let f of this.filters)
			f.prepare(gl);

	}

	/**
	 * Gets a uniform variable by name.
	 * Searches both shader uniforms and filter uniforms.
	 * @param {string} name - Uniform variable name
	 * @returns {Object|undefined} Uniform object if found
	 */
	getUniform(name) {
		let u = this.uniforms[name];
		if (u) return u;
		for (let f of this.filters) {
			u = f.uniforms[name];
			if (u) return u;
		}
		return u;
	}

	/**
	 * Returns all uniform variables associated with the shader and its filters.
	 * Combines uniforms from both the base shader and all active filters into a single object.
	 * @returns {Object.<string, Object>} Combined uniform variables
	 */
	allUniforms() {
		const result = this.uniforms;
		for (let f of this.filters) {
			Object.assign(result, f.uniforms);
		}
		return result;
	}

	/**
	 * Updates all uniform values in the GPU.
	 * @param {WebGL2RenderingContext} gl - WebGL2 context
	 * @private
	 */
	updateUniforms(gl) {
		for (const [name, uniform] of Object.entries(this.allUniforms())) {
			if (!uniform.location)
				uniform.location = gl.getUniformLocation(this.program, name);

			if (!uniform.location)  //uniform not used in program
				continue;

			if (uniform.needsUpdate) {
				let value = uniform.value;
				switch (uniform.type) {
					case 'vec4': gl.uniform4fv(uniform.location, value); break;
					case 'vec3': gl.uniform3fv(uniform.location, value); break;
					case 'vec2': gl.uniform2fv(uniform.location, value); break;
					case 'float': gl.uniform1f(uniform.location, value); break;
					case 'int': gl.uniform1i(uniform.location, value); break;
					case 'bool': gl.uniform1i(uniform.location, value); break;
					case 'mat3': gl.uniformMatrix3fv(uniform.location, false, value); break;
					case 'mat4': gl.uniformMatrix4fv(uniform.location, false, value); break;
					default: throw Error('Unknown uniform type: ' + u.type);
				}
				uniform.needsUpdate = false;
			}
		}
	}

	/**
	 * Gets vertex shader source code.
	 * Default implementation provides basic vertex transformation and texture coordinate passing.
	 * @param {WebGL2RenderingContext} gl - WebGL2 context
	 * @returns {string} Vertex shader source code
	 */
	vertShaderSrc(gl) {
		return `#version 300 es

precision highp float; 
precision highp int; 

uniform mat4 u_matrix;
in vec4 a_position;
in vec2 a_texcoord;

out vec2 v_texcoord;

			void main() {
				gl_Position = u_matrix * a_position;
				v_texcoord = a_texcoord;
			} `;
	}

	/**
	 * Gets fragment shader source code.
	 * Must be overridden in derived classes for custom shading.
	 * @returns {string} Fragment shader source code
	 * @virtual
	 */
	fragShaderSrc() {
		let str = `

in vec2 v_texcoord;

vec4 data() {
	vec4 color = texture(source, v_texcoord);
	${this.isLinear ? "" : "color = srgb2linear(color);"}
	return color;
}
`;
		return str;
	}
}
/**
 * Fired when shader state changes (uniforms, filters, etc).
 * @event Shader#update
 */

export { Shader }