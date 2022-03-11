
/**
 *  @param {object} options
 * *label*: used for menu
 * *samplers*: array of rasters {id:, type: } color, normals, etc.
 * *uniforms*: type = <vec4|vec3|vec2|float|int>, needsUpdate controls when updated in gl, size is unused, value is and array or a float, 
 *             we also want to support interpolation: source (value is the target), start, end are the timing (same as camera interpolation)
 * *body*: code actually performing the rendering, needs to return a vec4
 * *name*: name of the body function
 */

class Shader {
	constructor(options) {
		Object.assign(this, {
			version: 100,   //check for webglversion.
			samplers: [],
			uniforms: {},
			name: "",
			program: null,      //webgl program
			modes: [],
			needsUpdate: true,
			signals: { 'update':[] }
		});

		Object.assign(this, options);
	}

	setEvent(event, callback) {
		this.signals[event] = [callback];
	}

	emit(event) {
		for(let r of this.signals[event])
			r(this);
	}

	restoreWebGL(gl) {
		this.createProgram(gl);
	}

	setUniform(name, value) {
		let u = this.uniforms[name];
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
					default: throw Error('Unknown uniform type: ' + u.type);
				}
			}
		}
	}

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

	fragShaderSrc(gl) {
		throw 'Unimplemented!'
	}
}


export { Shader }
