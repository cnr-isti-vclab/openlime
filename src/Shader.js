
/**
 *  @param {object} options
 * *label*: used for menu
 * *samplers*: array of rasters {id:, type: } color, normals, etc.
 * *uniforms*:
 * *body*: code actually performing the rendering, needs to return a vec4
 * *name*: name of the body function
 */

class Shader {
	constructor(id, options) {
		this.id = id;
		Object.assign(this, {
			samplers: [],
			uniforms: {},
			name: "",
			body: "",
			program: null   //webgl program
		});
	}

	createProgram(gl) {

		let vert = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertShader, this.vertShaderSrc(100));

		let compiled = gl.compileShader(vert);
		if(!compiled) {
			console.log(gl.getShaderInfoLog(vert));
			throw "Failed vertex shader compilation: see console log and ask for support.";
		}

		let frag = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(frag, this.fragShaderSrc());
		gl.compileShader(frag);

		let program = gl.createProgram();

		compiled = gl.getShaderParameter(frag, gl.COMPILE_STATUS);
		if(!compiled) {
			console.log(gl.getShaderInfoLog(t.fragShader));
			throw "Failed fragment shader compilation: see console log and ask for support.";
		}

		gl.attachShader(program, vert);
		gl.attachShader(program, frag);
		gl.linkProgram(program);

		this.program = program;
	}

	vertShaderSrc(version) {
		if(!version) version = 100;
		return `
#version ${version}
precision highp float; 
precision highp int; 

uniform mat4 u_matrix;
attribute vec4 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
	gl_Position = u_matrix * a_position;
	v_texCoord = a_texCoord;
}`;
	}

	fragShaderSrc() {
		let str = this.header();
		str += this.attributes();
		str += `
vec4 ${name}() {
${this.body}
}
`;
		str += this.main();
		return str;
	}


	header() {
		let str = `

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

varying vec2 v_texcoord;

`;
		str += uniformsHeader();
		return str;
	}


	uniformsHeader() {
		return "";
	}


	main() {
		let str = `
void main() {
	vec4 color = ${this.id}();
	color.a *= opacity;
	fragColor = color;
}
`;
		return str;
	}

}


export { Shader }
