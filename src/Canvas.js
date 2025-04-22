import { Transform } from './Transform.js'
import { BoundingBox } from './BoundingBox.js'
import { addSignals } from './Signals.js'
import { Layer } from './Layer.js'
import { Cache } from './Cache.js'

//// HELPERS

window.structuredClone = typeof (structuredClone) == "function" ? structuredClone : function (value) { return JSON.parse(JSON.stringify(value)); };


/**
 * Canvas class that manages WebGL context, layers, and scene rendering.
 * Handles layer management, WebGL context creation/restoration, and render timing.
 */
class Canvas {
	/**
	 * Creates a new Canvas instance with WebGL context and overlay support.
	 * @param {HTMLCanvasElement|string} canvas - Canvas DOM element or selector
	 * @param {HTMLElement|string} overlay - Overlay DOM element or selector for decorations (annotations, glyphs)
	 * @param {Camera} camera - Scene camera instance
	 * @param {Object} [options] - Configuration options
	 * @param {Object} [options.layers] - Layer configurations mapping layer IDs to Layer instances
	 * @param {boolean} [options.preserveDrawingBuffer=false] - Whether to preserve WebGL buffers until manually cleared
	 * @param {number} [options.targetfps=30] - Target frames per second for rendering
	 * @param {boolean} [options.srgb=true] - Whether to enable sRGB color space or display-P3 for the output framebuffer
	 * @param {boolean} [options.stencil=false] - Whether to enable stencil buffer support
	 * @param {boolean} [options.useOffscreenFramebuffer=true] - Whether to use offscreen framebuffer for rendering
	 * @fires Canvas#update
	 * @fires Canvas#updateSize
	 * @fires Canvas#ready
	 */
	constructor(canvas, overlay, camera, options) {
		Object.assign(this, {
			canvasElement: null,
			preserveDrawingBuffer: false,
			gl: null,
			overlayElement: null,
			camera: camera,
			layers: {},
			targetfps: 30,
			fps: 0,
			timing: [16], //records last 30 frames time from request to next draw, rolling, primed to avoid /0
			timingLength: 5, //max number of timings.
			overBudget: 0, //fraction of frames that took too long to render.
			srgb: true,     // Enable sRGB color space by default
			isSrgbSimplified: true,
			stencil: false, // Disable stencil buffer by default
			useOffscreenFramebuffer: true, // Use offscreen framebuffer by default

			// Framebuffer objects
			offscreenFramebuffer: null,
			offscreenTexture: null,
			offscreenRenderbuffer: null,
			_renderingToOffscreen: false, // Traccia se stiamo renderizzando sul framebuffer off-screen

			signals: { 'update': [], 'updateSize': [], 'ready': [] },

			// Split viewport properties
			splitViewport: false,
			leftLayers: [],
			rightLayers: []
		});
		Object.assign(this, options);

		this.init(canvas, overlay);

		for (let id in this.layers)
			this.addLayer(id, new Layer(this.layers[id]));
		this.camera.addEvent('update', () => this.emit('update'));
	}

	/**
	 * Records render timing information and updates FPS statistics.
	 * @param {number} elapsed - Time elapsed since last frame in milliseconds
	 * @private
	 */
	addRenderTiming(elapsed) {
		this.timing.push(elapsed);
		while (this.timing.length > this.timingLength)
			this.timing.shift();
		this.overBudget = this.timing.filter(t => t > 1000 / this.targetfps).length / this.timingLength;
		this.fps = 1000 / (this.timing.reduce((sum, a) => sum + a, 0) / this.timing.length);
	}

	/**
	 * Initializes WebGL context and sets up event listeners.
	 * @param {HTMLCanvasElement|string} canvas - Canvas element or selector
	 * @param {HTMLElement|string} overlay - Overlay element or selector
	 * @throws {Error} If canvas or overlay elements cannot be found or initialized
	 * @private
	 */
	init(canvas, overlay) {
		if (!canvas)
			throw "Missing element parameter"

		if (typeof (canvas) == 'string') {
			canvas = document.querySelector(canvas);
			if (!canvas)
				throw "Could not find dom element.";
		}

		if (!overlay)
			throw "Missing element parameter"

		if (typeof (overlay) == 'string') {
			overlay = document.querySelector(overlay);
			if (!overlay)
				throw "Could not find dom element.";
		}

		if (!canvas.tagName)
			throw "Element is not a DOM element"

		if (canvas.tagName != "CANVAS")
			throw "Element is not a canvas element";

		this.canvasElement = canvas;
		this.overlayElement = overlay;

		/* test context loss */
		/* canvas = WebGLDebugUtils.makeLostContextSimulatingCanvas(canvas);
		canvas.loseContextInNCalls(1000); */

		const glopt = {
			antialias: false,
			depth: false,
			stencil: this.stencil,
			preserveDrawingBuffer: this.preserveDrawingBuffer,
			colorSpace: this.srgb ? 'srgb' : 'display-p3'
		};

		this.gl = this.gl ||
			canvas.getContext("webgl2", glopt);

		if (!this.gl)
			throw new Error("Could not create a WebGL 2.0 context");

		// Initialize offscreen framebuffer if enabled
		if (this.useOffscreenFramebuffer) {
			this.setupOffscreenFramebuffer();
		}

		canvas.addEventListener("webglcontextlost", (event) => { console.log("Context lost."); event.preventDefault(); }, false);
		canvas.addEventListener("webglcontextrestored", () => { this.restoreWebGL(); }, false);
		document.addEventListener("visibilitychange", (event) => { if (this.gl.isContextLost()) { this.restoreWebGL(); } });

		this.hasFloatRender = !!this.gl.getExtension('EXT_color_buffer_float');
		this.hasLinearFloat = !!this.gl.getExtension('OES_texture_float_linear');

		console.log('Support for rendering to float textures:', hasFloatRender);
		console.log('Support for linear filtering on float textures:', hasLinearFloat);
	}

	/**
	 * Sets up the offscreen framebuffer for rendering
	 * @private
	 */
	setupOffscreenFramebuffer() {
		const gl = this.gl;

		// Create a framebuffer
		this.offscreenFramebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.offscreenFramebuffer);

		// Create a texture to render to
		this.offscreenTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.offscreenTexture);

		// Define size based on canvas size
		const width = this.canvasElement.width;
		const height = this.canvasElement.height;

		// Initialize texture with null (we'll resize it properly in resizeOffscreenFramebuffer)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		// Set texture parameters
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		// If stencil is enabled, create a renderbuffer for it
		if (this.stencil) {
			this.offscreenRenderbuffer = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, this.offscreenRenderbuffer);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.offscreenRenderbuffer);
		}

		// Attach the texture to the framebuffer
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.offscreenTexture, 0);

		// Check framebuffer status
		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if (status !== gl.FRAMEBUFFER_COMPLETE) {
			console.error("Framebuffer not complete. Status:", status);
			// Fall back to direct rendering
			this.useOffscreenFramebuffer = false;
		}

		// Unbind framebuffer to restore default
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
		if (this.stencil) {
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		}
	}

	/**
	 * Resizes the offscreen framebuffer when canvas size changes
	 * @private
	 */
	resizeOffscreenFramebuffer() {
		if (!this.useOffscreenFramebuffer || !this.offscreenFramebuffer) return;

		const gl = this.gl;
		const width = this.canvasElement.width;
		const height = this.canvasElement.height;

		// Resize texture
		gl.bindTexture(gl.TEXTURE_2D, this.offscreenTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		// Resize renderbuffer if stencil is enabled
		if (this.stencil && this.offscreenRenderbuffer) {
			gl.bindRenderbuffer(gl.RENDERBUFFER, this.offscreenRenderbuffer);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
		}

		gl.bindTexture(gl.TEXTURE_2D, null);
		if (this.stencil) {
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		}
	}

	/**
	 * Gets the currently active framebuffer.
	 * Use this when you need to save the state before changing framebuffers.
	 * @returns {WebGLFramebuffer} The currently active framebuffer
	 */
	getActiveFramebuffer() {
		if (this.useOffscreenFramebuffer && this._renderingToOffscreen) {
			return this.offscreenFramebuffer;
		}
		return null; // Rappresenta il framebuffer di default (schermo)
	}

	/**
	 * Sets the active framebuffer.
	 * Use this to restore a previously saved state.
	 * @param {WebGLFramebuffer} framebuffer - The framebuffer to activate
	 */
	setActiveFramebuffer(framebuffer) {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
		this._renderingToOffscreen = (framebuffer === this.offscreenFramebuffer);
	}

	/**
	* Updates the state of the canvas and its components.
	* @param {Object} state - State object containing updates
	* @param {Object} [state.camera] - Camera state updates
	* @param {Object} [state.layers] - Layer state updates
	* @param {number} dt - Animation duration in milliseconds
	* @param {string} [easing='linear'] - Easing function for animations
	*/
	setState(state, dt, easing = 'linear') {
		if ('camera' in state) {
			const m = state.camera;
			this.camera.setPosition(dt, m.x, m.y, m.z, m.a, easing);
		}
		if ('layers' in state)
			for (const [k, layerState] of Object.entries(state.layers))
				if (k in this.layers) {
					const layer = this.layers[k];
					layer.setState(layerState, dt, easing);
				}
	}

	/**
	* Retrieves current state of the canvas and its components.
	* @param {Object} [stateMask=null] - Optional mask to filter returned state properties
	* @returns {Object} Current state object
	*/
	getState(stateMask = null) {
		let state = {};
		if (!stateMask || stateMask.camera) {
			let now = performance.now();
			let m = this.camera.getCurrentTransform(now);
			state.camera = { 'x': m.x, 'y': m.y, 'z': m.z, 'a': m.a };
		}
		state.layers = {};
		for (let layer of Object.values(this.layers)) {
			const layerMask = window.structuredClone(stateMask);
			if (stateMask && stateMask.layers) Object.assign(layerMask, stateMask.layers[layer.id]);
			state.layers[layer.id] = layer.getState(layerMask);
		}
		return state;
	}

	/**
	 * Restores WebGL context after loss.
	 * Reinitializes shaders and textures for all layers.
	 * @private
	 */
	restoreWebGL() {
		let glopt = {
			antialias: false,
			depth: false,
			stencil: this.stencil,
			preserveDrawingBuffer: this.preserveDrawingBuffer,
			colorSpace: this.srgb ? 'srgb' : 'display-p3'
		};

		this.gl = this.gl || this.canvasElement.getContext("webgl2", glopt);

		// Recreate offscreen framebuffer
		if (this.useOffscreenFramebuffer) {
			if (this.offscreenFramebuffer) {
				this.gl.deleteFramebuffer(this.offscreenFramebuffer);
			}
			if (this.offscreenTexture) {
				this.gl.deleteTexture(this.offscreenTexture);
			}
			if (this.offscreenRenderbuffer) {
				this.gl.deleteRenderbuffer(this.offscreenRenderbuffer);
			}
			this.setupOffscreenFramebuffer();
		}

		for (let layer of Object.values(this.layers)) {
			layer.gl = this.gl;
			layer.clear();
			if (layer.shader)
				layer.shader.restoreWebGL(this.gl);
		}
		this.prefetch();
		this.emit('update');
	}

	/**
	 * Adds a layer to the canvas.
	 * @param {string} id - Unique identifier for the layer
	 * @param {Layer} layer - Layer instance to add
	 * @fires Canvas#update
	 * @fires Canvas#ready
	 * @throws {Error} If layer ID already exists
	 */
	addLayer(id, layer) {

		console.assert(!(id in this.layers), "Duplicated layer id");

		layer.id = id;
		layer.addEvent('ready', () => {
			if (Object.values(this.layers).every(l => l.status == 'ready'))
				this.emit('ready');
			this.prefetch();
		});
		layer.addEvent('update', () => { this.emit('update'); });
		layer.addEvent('updateSize', () => { this.updateSize(); });
		layer.gl = this.gl;
		layer.canvas = this;
		layer.overlayElement = this.overlayElement;
		this.layers[id] = layer;
		this.prefetch();
	}

	/**
	 * Removes a layer from the canvas.
	 * @param {Layer} layer - Layer instance to remove
	 * @example
	 * const layer = new Layer(options);
	 * canvas.addLayer('map', layer);
	 * // ... later ...
	 * canvas.removeLayer(layer);
	 */
	removeLayer(layer) {
		layer.clear(); //order is important.

		delete this.layers[layer.id];
		delete Cache.layers[layer];
		this.prefetch();
	}

	/**
	 * Updates canvas size and camera bounds based on layers.
	 * @fires Canvas#updateSize
	 * @private
	 */
	updateSize() {
		const discardHidden = false;
		let sceneBBox = Layer.computeLayersBBox(this.layers, discardHidden);
		let minScale = Layer.computeLayersMinScale(this.layers, discardHidden);

		if (sceneBBox != null && this.camera.viewport)
			this.camera.updateBounds(sceneBBox, minScale);

		// Resize offscreen framebuffer when canvas size changes
		if (this.useOffscreenFramebuffer) {
			this.resizeOffscreenFramebuffer();
		}

		this.emit('updateSize');
	}

	/**
	 * Enables or disables split viewport mode and sets which layers appear on each side
	 * @param {boolean} enabled - Whether split viewport mode is enabled
	 * @param {string[]} leftLayerIds - Array of layer IDs to show on left side
	 * @param {string[]} rightLayerIds - Array of layer IDs to show on right side
	 * @fires Canvas#update
	 */
	setSplitViewport(enabled, leftLayerIds = [], rightLayerIds = []) {
		this.splitViewport = enabled;
		this.leftLayers = leftLayerIds;
		this.rightLayers = rightLayerIds;
		this.emit('update');
	}

	/**
	 * Renders a frame at the specified time.
	 * @param {number} time - Current time in milliseconds
	 * @returns {boolean} True if all animations are complete
	 * @private
	 */
	draw(time) {
		let gl = this.gl;
		let view = this.camera.glViewport();

		// Bind offscreen framebuffer if enabled
		if (this.useOffscreenFramebuffer) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.offscreenFramebuffer);
			this._renderingToOffscreen = true;
		} else {
			this._renderingToOffscreen = false;
		}

		gl.viewport(view.x, view.y, view.dx, view.dy);

		var b = [0, 0, 0, 0];
		gl.clearColor(b[0], b[1], b[2], b[3], b[4]);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		let pos = this.camera.getGlCurrentTransform(time);
		this.prefetch(pos);

		//pos layers using zindex.
		let ordered = Object.values(this.layers).sort((a, b) => a.zindex - b.zindex);

		let done = true;

		if (this.splitViewport) {
			// For split viewport mode, we need to enable scissor test to split the rendering area
			gl.enable(gl.SCISSOR_TEST);

			const halfWidth = Math.floor(view.dx / 2);

			// Draw left side (apply scissor to left half)
			gl.scissor(view.x, view.y, halfWidth, view.dy);
			for (let layer of ordered) {
				if (this.leftLayers.includes(layer.id)) {
					// Pass the full viewport but scissor will restrict drawing
					done = layer.draw(pos, view) && done;
				}
			}

			// Draw right side (apply scissor to right half)
			gl.scissor(view.x + halfWidth, view.y, view.dx - halfWidth, view.dy);
			for (let layer of ordered) {
				if (this.rightLayers.includes(layer.id)) {
					// Pass the full viewport but scissor will restrict drawing
					done = layer.draw(pos, view) && done;
				}
			}

			// Disable scissor when done
			gl.disable(gl.SCISSOR_TEST);
		} else {
			// Standard rendering for normal mode
			for (let layer of ordered) {
				if (layer.visible)
					done = layer.draw(pos, view) && done;
			}
		}

		// Copy offscreen framebuffer to the screen if enabled
		if (this.useOffscreenFramebuffer) {
			// Switch to default framebuffer (the screen)
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			this._renderingToOffscreen = false;

			// Draw the offscreen texture to the screen
			this.drawOffscreenToCanvas();
		}

		// Use the isComplete flag from the transform instead of direct time comparison
		return done && pos.isComplete;
	}

	/**
	 * Draws the offscreen framebuffer texture to the canvas
	 * @private
	 */
	drawOffscreenToCanvas() {
		const gl = this.gl;
		const view = this.camera.glViewport();

		// Set viewport for the final display
		gl.viewport(view.x, view.y, view.dx, view.dy);

		// If we don't already have a fullscreen quad program, create one
		if (!this._fullscreenQuadProgram) {
			// Vertex shader
			const vsSource = `#version 300 es
				in vec4 aPosition;
				in vec2 aTexCoord;
				out vec2 vTexCoord;
				
				void main() {
					gl_Position = aPosition;
					vTexCoord = aTexCoord;
				}
			`;

			// Fragment shader
			let fsSource = `#version 300 es
			precision highp float;
			in vec2 vTexCoord;
			uniform sampler2D uTexture;
			out vec4 fragColor;`;

			if (this.isSrgbSimplified) {
				fsSource += `
			vec4 linear2srgb(vec4 linear) {
				return vec4(pow(linear.rgb, vec3(1.0/2.2)), linear.a);
			}`;
			} else {
				fsSource += `
			vec4 linear2srgb(vec4 linear) {
				bvec3 cutoff = lessThan(linear.rgb, vec3(0.0031308));
				vec3 higher = vec3(1.055) * pow(linear.rgb, vec3(1.0/2.4)) - vec3(0.055);
				vec3 lower = linear.rgb * vec3(12.92);
				return vec4(mix(higher, lower, cutoff), linear.a);
			}`;
			}

			fsSource += `
		void main() {
			fragColor = texture(uTexture, vTexCoord);
			fragColor = linear2srgb(fragColor);
			fragColor = clamp(fragColor, 0.0, 1.0);
		}`;

			// Create shader program
			const vertexShader = this._createShader(gl, gl.VERTEX_SHADER, vsSource);
			const fragmentShader = this._createShader(gl, gl.FRAGMENT_SHADER, fsSource);
			this._fullscreenQuadProgram = this._createProgram(gl, vertexShader, fragmentShader);

			// Get attribute and uniform locations
			this._positionLocation = gl.getAttribLocation(this._fullscreenQuadProgram, 'aPosition');
			this._texCoordLocation = gl.getAttribLocation(this._fullscreenQuadProgram, 'aTexCoord');
			this._textureLocation = gl.getUniformLocation(this._fullscreenQuadProgram, 'uTexture');

			// Create buffers for fullscreen quad
			this._quadPositionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this._quadPositionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
				-1.0, 1.0, 0.0,
				-1.0, -1.0, 0.0,
				1.0, 1.0, 0.0,
				1.0, -1.0, 0.0
			]), gl.STATIC_DRAW);

			this._quadTexCoordBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this._quadTexCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
				0.0, 1.0,
				0.0, 0.0,
				1.0, 1.0,
				1.0, 0.0
			]), gl.STATIC_DRAW);

			// Create vertex array object (VAO)
			this._quadVAO = gl.createVertexArray();
			gl.bindVertexArray(this._quadVAO);

			// Set up position attribute
			gl.bindBuffer(gl.ARRAY_BUFFER, this._quadPositionBuffer);
			gl.enableVertexAttribArray(this._positionLocation);
			gl.vertexAttribPointer(this._positionLocation, 3, gl.FLOAT, false, 0, 0);

			// Set up texcoord attribute
			gl.bindBuffer(gl.ARRAY_BUFFER, this._quadTexCoordBuffer);
			gl.enableVertexAttribArray(this._texCoordLocation);
			gl.vertexAttribPointer(this._texCoordLocation, 2, gl.FLOAT, false, 0, 0);

			// Unbind VAO
			gl.bindVertexArray(null);
		}

		// Set clear color and clear the screen
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// Use the fullscreen quad program
		gl.useProgram(this._fullscreenQuadProgram);

		// Bind the VAO
		gl.bindVertexArray(this._quadVAO);

		// Bind the offscreen texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.offscreenTexture);
		gl.uniform1i(this._textureLocation, 0);

		// Draw the quad
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		// Unbind VAO and texture
		gl.bindVertexArray(null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	/**
	 * Helper method to create a shader
	 * @param {WebGL2RenderingContext} gl - WebGL context
	 * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
	 * @param {string} source - Shader source code
	 * @returns {WebGLShader} Compiled shader
	 * @private
	 */
	_createShader(gl, type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	/**
	 * Helper method to create a shader program
	 * @param {WebGL2RenderingContext} gl - WebGL context
	 * @param {WebGLShader} vertexShader - Vertex shader
	 * @param {WebGLShader} fragmentShader - Fragment shader
	 * @returns {WebGLProgram} Linked shader program
	 * @private
	 */
	_createProgram(gl, vertexShader, fragmentShader) {
		const program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('Program linking error:', gl.getProgramInfoLog(program));
			gl.deleteProgram(program);
			return null;
		}

		return program;
	}

	/**
	 * Schedules tile downloads based on current view.
	 * @param {Object} [transform] - Optional transform override, defaults to current camera transform
	 * @private
	 */
	prefetch(transform) {
		if (!transform)
			transform = this.camera.getGlCurrentTransform(performance.now());
		for (let id in this.layers) {
			let layer = this.layers[id];
			//console.log(layer);
			//console.log(layer.layout.status);
			if (layer.visible && layer.status == 'ready') {
				layer.prefetch(transform, this.camera.glViewport());
			}
		}
	}

	/**
	 * Cleanup resources when canvas is no longer needed
	 */
	dispose() {
		const gl = this.gl;

		// Clean up offscreen framebuffer resources
		if (this.useOffscreenFramebuffer) {
			if (this.offscreenFramebuffer) {
				gl.deleteFramebuffer(this.offscreenFramebuffer);
				this.offscreenFramebuffer = null;
			}

			if (this.offscreenTexture) {
				gl.deleteTexture(this.offscreenTexture);
				this.offscreenTexture = null;
			}

			if (this.offscreenRenderbuffer) {
				gl.deleteRenderbuffer(this.offscreenRenderbuffer);
				this.offscreenRenderbuffer = null;
			}
		}

		// Clean up fullscreen quad resources
		if (this._fullscreenQuadProgram) {
			gl.deleteProgram(this._fullscreenQuadProgram);
			this._fullscreenQuadProgram = null;
		}

		if (this._quadVAO) {
			gl.deleteVertexArray(this._quadVAO);
			this._quadVAO = null;
		}

		if (this._quadPositionBuffer) {
			gl.deleteBuffer(this._quadPositionBuffer);
			this._quadPositionBuffer = null;
		}

		if (this._quadTexCoordBuffer) {
			gl.deleteBuffer(this._quadTexCoordBuffer);
			this._quadTexCoordBuffer = null;
		}

		// Clean up layers
		for (const id in this.layers) {
			this.removeLayer(this.layers[id]);
		}
	}
}

/**
 * Fired when canvas content is updated (layer changes, camera moves).
 * @event Canvas#update
 */

/**
 * Fired when canvas or layout size changes.
 * @event Canvas#updateSize
 */

/**
 * Fired when all layers are initialized and ready to display.
 * @event Canvas#ready
 */

addSignals(Canvas, 'update', 'updateSize', 'ready');

export { Canvas }