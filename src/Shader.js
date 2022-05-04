/**
 * A reference to a 2D texture.
 * @typedef {Object} Shader#Sampler
 * @property {number} id A sampler unique identifier.
 * @property {string} name The sampler name (the texture reference name in the shader program).
 */

/**
 * The `Shader` class allows shader programs to be linked and used.
 * This class supports shader programs written in the OpenGL/ES Shading Language (GLSL/ES) with 2.0 amd 3.0 specifications.
 * 
 * The `Shader` class keeps the programmer away from the details of compiling and linking vertex and fragment shaders.
 * The following example creates a fragment shader program using the supplied source code. Once compiled and linked, 
 * the shader program is activated in the current WebGLContext.
 * ```
 * const shader = new OpenLIME.Shader({
 *      'label': 'Rgb',
 *      'samplers': [{ id: 0, name: 'kd' }]
 * });
 * // The fragment shader script
 * shader.fragShaderSrc = function (gl) {
 *      let gl2 = !(gl instanceof WebGLRenderingContext);
 *      let str = `${gl2 ? '#version 300 es' : ''}
 *      precision highp float;
 *      precision highp int;
 *
 *      uniform sampler2D kd;
 *      uniform float u_colorFactor;
 *      ...
 *
 *      return str;
 * };
 * // Declares a uniform.
 * shader.uniforms = {
 *      u_colorFactor: { type: 'float', needsUpdate: true, size: 1, value: 0.0 },
 * };
 * // Adds the shader to the Layer and set it as the current one.
 * this.shaders['bw'] = shader;
 * this.setShader('bw');
 * ```
 */
class Shader {
 /** 
 * Instantiates a Shader class. An object literal with Shader `options` can be specified.
 * @param {Object} [options] An object literal describing the shader content.
 * @param {Array<Shader#Sampler>} options.samplers An array of pointers to 2D textures. 
 * @param {Array<string>} options.modes An optional array of labels that identify different shader behaviors.
 */
  constructor(options) {
		Object.assign(this, {
			version: 100,   //check for webglversion. 
			samplers: [],
			uniforms: {},
			label: null, 
			program: null,      //webgl program
			modes: [],
			mode: null, // The current mode
			needsUpdate: true,
			signals: { 'update':[] }
		});
		Object.assign(this, options);
	}
	/**
	 * Sets the current mode of the shader
	 * @param {string} mode The mode identifier
	 */
	setMode(mode) {
		if (this.modes.indexOf(mode) == -1)
			throw Error("Unknown mode: " + mode);
		this.mode = mode;
		this.needsUpdate = true;
	}

	/*
 	* Adds a Shader Event callback
 	* @param {string} event A label to identify the event.
 	* @param {Function} callback The event callback function.
 	*/
	 /** @ignore */
	setEvent(event, callback) {
		this.signals[event] = [callback];
	}

	/** @ignore */
	emit(event) {
		for(let r of this.signals[event])
			r(this);
	}

	/** @ignore */
	restoreWebGL(gl) {
		this.createProgram(gl);
	}

	/**
	 * Sets the value of a uniform variable.
	 * @param {string} name The name of the uniform variable.
	 * @param {*} value The value to assign.
	 */
	setUniform(name, value) {
		/**
		* The event is fired when a uniform shader variable is changed.
		* @event Camera#update
		*/
		let u = this.uniforms[name];
		if(!u)
			throw new Error(`Unknown '${name}'. It is not a registered uniform.`);

		if(typeof(value) == "number" && u.value == value) 
			return;
		if(Array.isArray(value) && Array.isArray(u.value) && value.length == u.value.length) {
			let equal = true;
			for(let i = 0; i < value.length; i++)
				if(value[i] != u.value[i]) {
					equal = false;
					break;
				}
			if(equal)
				return;
		}

		u.value = value;
		u.needsUpdate = true;
		this.emit('update');
	}

	/** @ignore */
	createProgram(gl) {

		let vert = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vert, this.vertShaderSrc(gl));

		gl.compileShader(vert);
		let compiled = gl.getShaderParameter(vert, gl.COMPILE_STATUS);
		if(!compiled) {
			console.log(gl.getShaderInfoLog(vert));
			throw Error("Failed vertex shader compilation: see console log and ask for support.");
		}

		let frag = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(frag, this.fragShaderSrc(gl));
		gl.compileShader(frag);

		if(this.program)
			gl.deleteProgram(this.program);

		let program = gl.createProgram();

		gl.getShaderParameter(frag, gl.COMPILE_STATUS);
		compiled = gl.getShaderParameter(frag, gl.COMPILE_STATUS);
		if(!compiled) {
			console.log(this.fragShaderSrc())
			console.log(gl.getShaderInfoLog(frag));
			throw Error("Failed fragment shader compilation: see console log and ask for support.");
		}

		gl.attachShader(program, vert);
		gl.attachShader(program, frag);
		gl.linkProgram(program);

		if ( !gl.getProgramParameter( program, gl.LINK_STATUS) ) {
			var info = gl.getProgramInfoLog(program);
			throw new Error('Could not compile WebGL program. \n\n' + info);
		}

		//sampler units;
		for(let sampler of this.samplers)
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

		for(let uniform of Object.values(this.uniforms)) {
			uniform.location = null;
			uniform.needsUpdate = true;
		}
	}

	/** @ignore */
	updateUniforms(gl, program) {
		let now = performance.now();
		for(const [name, uniform] of Object.entries(this.uniforms)) {
			if(!uniform.location)
				uniform.location = gl.getUniformLocation(program, name);

			if(!uniform.location)  //uniform not used in program
				continue; 

			if(uniform.needsUpdate) {
				let value = uniform.value;
				switch(uniform.type) {
					case 'vec4':  gl.uniform4fv(uniform.location, value); break;
					case 'vec3':  gl.uniform3fv(uniform.location, value); break;
					case 'vec2':  gl.uniform2fv(uniform.location, value); break;
					case 'float': gl.uniform1f(uniform.location, value); break;
					case 'int':   gl.uniform1i (uniform.location, value); break;
					case 'mat3':  gl.uniformMatrix3fv (uniform.location, false, value); break;
					case 'mat4':  gl.uniformMatrix4fv (uniform.location, false, value); break;
					default: throw Error('Unknown uniform type: ' + u.type);
				}
			}
		}
	}

	/**
	 * Gets the vertex shader script. By default it only applies the view matrix and passes the texture coordinates to the fragment shader.
	 * @param {*} gl Thegl context.
	 * @returns {string} The vertex shader script.
	 */
	vertShaderSrc(gl) {
		let gl2 = !(gl instanceof WebGLRenderingContext);
		return `${gl2? '#version 300 es':''}

precision highp float; 
precision highp int; 

uniform mat4 u_matrix;
${gl2? 'in' : 'attribute'} vec4 a_position;
${gl2? 'in' : 'attribute'} vec2 a_texcoord;

${gl2? 'out' : 'varying'} vec2 v_texcoord;

void main() {
	gl_Position = u_matrix * a_position;
	v_texcoord = a_texcoord;
}`;
	}

	/**
	 * Gets the fragment shader script. This is a virtual function and MUST be redefined in derived classes.
	 * @param {*} gl Thegl context.
	 * @returns {string} The vertex shader script.
	 */
	 fragShaderSrc(gl) {
		throw 'Unimplemented!'
	}
}


export { Shader }
