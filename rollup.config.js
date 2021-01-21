import { terser } from "rollup-plugin-terser";

function header() {
	return {

		renderChunk( code ) {
			return "//license \n" + code;
		}
	};

}

export default [
	{
		input: './src/OpenLime.js',
		output: [{
			format: 'umd',
			name: 'OpenLime',
			file: 'build/openlime.min.js',
			plugins: [terser()],
			globals: {  }
		},
		{
			format: 'umd',
			name: 'Nexus3D',
			file: 'build/openlime.js',
			globals: { }
		}],
		external: []
	}
	
];
