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
		input: './src/OpenLIME.js',
		output: [{
			format: 'umd',
			name: 'OpenLIME',
			file: 'build/openlime.min.js',
			plugins: [terser()],
			globals: {  }
		},
		{
			format: 'umd',
			name: 'OpenLIME',
			file: 'build/openlime.js',
			globals: { }
		}],
		external: []
	}
	
];
