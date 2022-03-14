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
			file: 'dist/js/openlime.min.js',
			plugins: [terser()],
			globals: {  }
		},
		{
			format: 'umd',
			name: 'OpenLIME',
			file: 'dist/js/openlime.js',
			globals: { }
		}],
		external: []
	}
	
];
