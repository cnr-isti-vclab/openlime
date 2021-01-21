(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Nexus3D = {}));
}(this, (function (exports) { 'use strict';

	class Canvas {

		constructor(div, options) {
			console.log("Canvas constructor");
		}

	}

	class OpenLime {

		constructor(div, options) {
			console.log("This is just a test");
			this.canvas = new Canvas(div, options);
		}
	}

	exports.OpenLime = OpenLime;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
