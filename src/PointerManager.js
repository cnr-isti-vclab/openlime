/**
 * The `PointerManager` class serves as a central event manager that interprets raw pointer events 
 * (like mouse clicks, touch gestures, or stylus inputs) into higher-level gestures. It abstracts 
 * away the complexity of handling multiple input types and transforms them into common gestures 
 * like taps, holds, panning (drag), and pinch-to-zoom, which are common in modern user interfaces.
 * 
 * Key mechanisms:
 * 
 * 1. **Event Handling and Gesture Recognition**:
 *    - `PointerManager` listens for low-level pointer events (such as `pointerdown`, `pointermove`, 
 *      and `pointerup`) and converts them into higher-level gestures. 
 *    - For example, a quick touch and release is interpreted as a "tap," while a sustained touch 
 *      (greater than 600ms) is recognized as a "hold."
 *    - It handles both mouse and touch events uniformly, making it ideal for web applications that 
 *      need to support diverse input devices (mouse, trackpad, touch screens).
 * 
 * 2. **Multi-pointer Support**:
 *    - `PointerManager` supports multiple pointers simultaneously, making it capable of recognizing 
 *      complex gestures involving more than one finger or pointer, such as pinch-to-zoom. 
 *    - For multi-pointer gestures, it tracks each pointer's position and movement separately, 
 *      allowing precise gesture handling.
 * 
 * 3. **Idle Detection**:
 *    - The class includes idle detection mechanisms, which can trigger actions or events when no 
 *      pointer activity is detected for a specified period. This can be useful for implementing 
 *      user inactivity warnings or pausing certain interactive elements when the user is idle.
 * 
 * 4. **Callback-based Gesture Management**:
 *    - The core of the `PointerManager` class revolves around registering and triggering callbacks 
 *      for different gestures. Callbacks are provided by the user of this class for events like 
 *      pan (`onPan`), pinch (`onPinch`), and others.
 *    - The class ensures that once a gesture starts, it monitors and triggers the appropriate 
 *      callbacks, such as `panStart`, `panMove`, and `panEnd`, depending on the detected gesture.
 * 
 * 5. **Buffer Management**:
 *    - The `PointerManager` class also includes a buffer system for managing and storing recent 
 *      events, allowing the developer to enqueue, push, pop, or shift pointer data as needed. 
 *      This can be helpful for applications that need to track the history of pointer events 
 *      for gesture recognition or undo functionality.
 * 
 * 6. **Error Handling**:
 *    - The class includes error handling to ensure that all required gesture handlers are defined 
 *      by the user. For example, it will throw an error if any essential callback functions for 
 *      pan or pinch gestures are missing, ensuring robust gesture management.
 * 
 * Typical usage involves:
 * - Registering gesture handlers (e.g., for taps, panning, pinching).
 * - The class then monitors all pointer events and triggers the corresponding gesture callbacks 
 *   when appropriate.
 * 
 * Example:
 * ```js
 * const manager = new PointerManager();
 * manager.onPan({
 *   panStart: (e) => console.log('Pan started', e),
 *   panMove: (e) => console.log('Panning', e),
 *   panEnd: (e) => console.log('Pan ended', e),
 *   priority: 1
 * });
 * manager.onPinch({
 *   pinchStart: (e) => console.log('Pinch started', e),
 *   pinchMove: (e) => console.log('Pinching', e),
 *   pinchEnd: (e) => console.log('Pinch ended', e),
 *   priority: 1
 * });
 * ```
 * 
 * In this example, `PointerManager` registers handlers for pan and pinch gestures, automatically 
 * converting pointer events into the desired interactions. By abstracting the raw pointer events, 
 * `PointerManager` allows developers to focus on handling higher-level gestures without worrying 
 * about the underlying complexity.
* @fires PointerManager#fingerHover - Triggered when a pointer moves over a target.
* @fires PointerManager#fingerSingleTap - Triggered on a quick touch or click.
* @fires PointerManager#fingerDoubleTap - Triggered on two quick touches or clicks.
* @fires PointerManager#fingerHold - Triggered when a touch or click is held for more than 600ms.
* @fires PointerManager#mouseWheel - Triggered when the mouse wheel is rotated.
* @fires PointerManager#panStart - Triggered when a pan (drag) gesture begins.
* @fires PointerManager#panMove - Triggered during a pan gesture.
* @fires PointerManager#panEnd - Triggered when a pan gesture ends.
* @fires PointerManager#pinchStart - Triggered when a pinch gesture begins.
* @fires PointerManager#pinchMove - Triggered during a pinch gesture.
* @fires PointerManager#pinchEnd - Triggered when a pinch gesture ends.
* 
*/
class PointerManager {
    /**
     * Creates a new PointerManager instance.
     * @param {HTMLElement} target - DOM element to attach event listeners to
     * @param {Object} [options] - Configuration options
     * @param {number} [options.pinchMaxInterval=250] - Maximum time (ms) between touches to trigger pinch
     * @param {number} [options.idleTime=60] - Seconds of inactivity before idle event
     */
    constructor(target, options) {

        this.target = target;

        Object.assign(this, {
            pinchMaxInterval: 250,        // in ms, fingerDown event max distance in time to trigger a pinch.
            idleTime: 60, //in seconds,
        });

        if (options)
            Object.assign(this, options);

        this.idleTimeout = null;
        this.idling = false;

        this.currentPointers = [];
        this.eventObservers = new Map();
        this.ppmm = PointerManager.getPixelsPerMM();

        this.target.style.touchAction = "none";
        this.target.addEventListener('pointerdown', (e) => this.handleEvent(e), false);
        this.target.addEventListener('pointermove', (e) => this.handleEvent(e), false);
        this.target.addEventListener('pointerup', (e) => this.handleEvent(e), false);
        this.target.addEventListener('pointercancel', (e) => this.handleEvent(e), false);
        this.target.addEventListener('wheel', (e) => this.handleEvent(e), false);

        this.startIdle();
    }

    /**
     * Constant for targeting all pointers.
     * @type {number}
     * @readonly
     */
    static get ANYPOINTER() { return -1; }

    /// Utilities

    /**
     * Splits a string into an array based on whitespace.
     * 
     * @param {string} str - The input string to split.
     * @returns {Array<string>} An array of strings split by whitespace.
     * @private
     */
    static splitStr(str) {
        return str.trim().split(/\s+/g);
    }

    /**
     * Calculates device pixels per millimeter.
     * @returns {number} Pixels per millimeter for current display
     * @private
     */
    static getPixelsPerMM() {
        // Get the device pixel ratio
        const pixelRatio = window.devicePixelRatio || 1;

        // Create a div to measure
        const div = document.createElement("div");
        div.style.width = "1in";
        div.style.height = "1in";
        div.style.position = "absolute";
        div.style.left = "-100%";
        div.style.top = "-100%";
        document.body.appendChild(div);

        // Measure the div
        const pixelsPerInch = div.offsetWidth * pixelRatio;

        // Clean up
        document.body.removeChild(div);

        // Convert pixels per inch to pixels per mm
        const pixelsPerMM = pixelsPerInch / 25.4;

        return pixelsPerMM;
    }

    ///////////////////////////////////////////////////////////
    /// Class interface

    /**
     * Registers event handlers.
     * @param {string} eventTypes - Space-separated list of event types
     * @param {Object|Function} obj - Handler object or function
     * @param {number} [idx=ANYPOINTER] - Pointer index to target, or ANYPOINTER for all
     * @returns {Object} Handler object
     */
    on(eventTypes, obj, idx = PointerManager.ANYPOINTER) {
        eventTypes = PointerManager.splitStr(eventTypes);

        if (typeof (obj) == 'function') {
            obj = Object.fromEntries(eventTypes.map(e => [e, obj]));
            obj.priority = -1000;
        }

        eventTypes.forEach(eventType => {
            if (idx == PointerManager.ANYPOINTER) {
                this.broadcastOn(eventType, obj);
            } else {
                const p = this.currentPointers[idx];
                if (!p) {
                    throw new Error("Bad Index");
                }
                p.on(eventType, obj);
            }
        });
        return obj;
    }

    /**
     * Unregisters event handlers.
     * @param {string} eventTypes - Space-separated list of event types
     * @param {Object|Function} callback - Handler to remove
     * @param {number} [idx=ANYPOINTER] - Pointer index to target
     */
    off(eventTypes, callback, idx = PointerManager.ANYPOINTER) {
        if (idx == PointerManager.ANYPOINTER) {
            this.broadcastOff(eventTypes, callback);
        } else {
            PointerManager.splitStr(eventTypes).forEach(eventType => {
                const p = this.currentPointers[idx];
                if (!p) {
                    throw new Error("Bad Index");
                }
                p.off(eventType, callback);
            });
        }
    }

    /**
     * Registers a complete event handler with multiple callbacks.
     * @param {Object} handler - Handler object
     * @param {number} handler.priority - Handler priority (higher = earlier execution)
     * @param {Function} [handler.fingerHover] - Hover callback
     * @param {Function} [handler.fingerSingleTap] - Single tap callback
     * @param {Function} [handler.fingerDoubleTap] - Double tap callback
     * @param {Function} [handler.fingerHold] - Hold callback
     * @param {Function} [handler.mouseWheel] - Mouse wheel callback
     * @param {Function} [handler.panStart] - Pan start callback
     * @param {Function} [handler.panMove] - Pan move callback
     * @param {Function} [handler.panEnd] - Pan end callback
     * @param {Function} [handler.pinchStart] - Pinch start callback
     * @param {Function} [handler.pinchMove] - Pinch move callback
     * @param {Function} [handler.pinchEnd] - Pinch end callback
     * @throws {Error} If handler lacks priority or required callbacks
     */
    onEvent(handler) {
        const cb_properties = ['fingerHover', 'fingerSingleTap', 'fingerDoubleTap', 'fingerHold', 'mouseWheel', 'wentIdle', 'activeAgain'];
        if (!handler.hasOwnProperty('priority'))
            throw new Error("Event handler has not priority property");

        if (!cb_properties.some((e) => typeof (handler[e]) == 'function'))
            throw new Error("Event handler properties are wrong or missing");

        for (let e of cb_properties)
            if (typeof (handler[e]) == 'function') {
                this.on(e, handler);
            }
        if (handler.panStart)
            this.onPan(handler);
        if (handler.pinchStart)
            this.onPinch(handler);
    }

    /**
     * Registers callbacks for pan gestures (start, move, and end).
     * 
     * @param {Object} handler - The handler object containing pan gesture callbacks.
     * @param {function} handler.panStart - Callback function executed when the pan gesture starts.
     * @param {function} handler.panMove - Callback function executed during the pan gesture movement.
     * @param {function} handler.panEnd - Callback function executed when the pan gesture ends.
     * @throws {Error} Throws an error if any required callback functions (`panStart`, `panMove`, `panEnd`) are missing.
     */
    onPan(handler) {
        const cb_properties = ['panStart', 'panMove', 'panEnd'];
        if (!handler.hasOwnProperty('priority'))
            throw new Error("Event handler has not priority property");

        if (!cb_properties.every((e) => typeof (handler[e]) == 'function'))
            throw new Error("Pan handler is missing one of this functions: panStart, panMove or panEnd");

        handler.fingerMovingStart = (e) => {
            handler.panStart(e);
            if (!e.defaultPrevented) return;
            this.on('fingerMoving', (e1) => {
                handler.panMove(e1);
            }, e.idx);
            this.on('fingerMovingEnd', (e2) => {
                handler.panEnd(e2);
            }, e.idx);
        }
        this.on('fingerMovingStart', handler);
    }

    /**
     * Registers callbacks for pinch gestures (start, move, and end).
     * 
     * @param {Object} handler - The handler object containing pinch gesture callbacks.
     * @param {function} handler.pinchStart - Callback function executed when the pinch gesture starts.
     * @param {function} handler.pinchMove - Callback function executed during the pinch gesture movement.
     * @param {function} handler.pinchEnd - Callback function executed when the pinch gesture ends.
     * @throws {Error} Throws an error if any required callback functions (`pinchStart`, `pinchMove`, `pinchEnd`) are missing.
     */
    onPinch(handler) {
        const cb_properties = ['pinchStart', 'pinchMove', 'pinchEnd'];
        if (!handler.hasOwnProperty('priority'))
            throw new Error("Event handler has not priority property");

        if (!cb_properties.every((e) => typeof (handler[e]) == 'function'))
            throw new Error("Pinch handler is missing one of this functions: pinchStart, pinchMove or pinchEnd");

        handler.fingerDown = (e1) => {
            //find other pointers not in moving status
            const filtered = this.currentPointers.filter(cp => cp && cp.idx != e1.idx && cp.status == cp.stateEnum.DETECT);
            if (filtered.length == 0) return;

            //for each pointer search for the last fingerDown event.
            const fingerDownEvents = [];
            for (let cp of filtered) {
                let down = null;
                for (let e of cp.eventHistory.toArray())
                    if (e.fingerType == 'fingerDown')
                        down = e;
                if (down)
                    fingerDownEvents.push(down);
            }
            //we start from the closest one
            //TODO maybe we should sort by distance instead.
            fingerDownEvents.sort((a, b) => b.timeStamp - a.timeStamp);
            for (let e2 of fingerDownEvents) {
                if (e1.timeStamp - e2.timeStamp > this.pinchMaxInterval) break;

                handler.pinchStart(e1, e2);
                if (!e1.defaultPrevented) break;

                clearTimeout(this.currentPointers[e1.idx].timeout);
                clearTimeout(this.currentPointers[e2.idx].timeout);

                this.on('fingerMovingStart', (e) => e.preventDefault(), e1.idx); //we need to capture this event (pan conflict)
                this.on('fingerMovingStart', (e) => e.preventDefault(), e2.idx);
                this.on('fingerMoving', (e) => e2 && handler.pinchMove(e1 = e, e2), e1.idx); //we need to assign e1 and e2, to keep last position.
                this.on('fingerMoving', (e) => e1 && handler.pinchMove(e1, e2 = e), e2.idx);

                this.on('fingerMovingEnd', (e) => {
                    if (e2)
                        handler.pinchEnd(e, e2);
                    e1 = e2 = null;
                }, e1.idx);
                this.on('fingerMovingEnd', (e) => {
                    if (e1)
                        handler.pinchEnd(e1, e);
                    e1 = e2 = null;
                }, e2.idx);

                break;
            }
        }
        this.on('fingerDown', handler);
    }
    ///////////////////////////////////////////////////////////
    /// Implementation stuff

    // register broadcast handlers
    broadcastOn(eventType, obj) {
        if (!this.eventObservers.has(eventType)) {
            this.eventObservers.set(eventType, new Set());
        }
        this.eventObservers.get(eventType).add(obj);
    }

    broadcastOff(eventTypes, obj) {
        PointerManager.splitStr(eventTypes).forEach(eventType => {
            if (this.eventObservers.has(eventType)) {
                if (!obj) {
                    this.eventObservers.delete(eventType);
                } else {
                    const handlers = this.eventObservers.get(eventType);
                    handlers.delete(obj);
                    if (handlers.size === 0) {
                        this.eventObservers.delete(eventType);
                    }
                }
            }
        });
    }

    broadcast(e) {
        if (!this.eventObservers.has(e.fingerType)) return;
        const handlers = Array.from(this.eventObservers.get(e.fingerType));
        handlers.sort((a, b) => b.priority - a.priority);
        for (const obj of handlers) {
            obj[e.fingerType](e);
            if (e.defaultPrevented) break;
        }
    }

    addCurrPointer(cp) {
        let result = -1;
        for (let i = 0; i < this.currentPointers.length && result < 0; i++) {
            if (this.currentPointers[i] == null) {
                result = i;
            }
        }
        if (result < 0) {
            this.currentPointers.push(cp);
            result = this.currentPointers.length - 1;
        } else {
            this.currentPointers[result] = cp;
        }

        return result;
    }

    removeCurrPointer(index) {
        this.currentPointers[index] = null;
        while ((this.currentPointers.length > 0) && (this.currentPointers[this.currentPointers.length - 1] == null)) {
            this.currentPointers.pop();
        }
    }

    startIdle() {
        if (this.idleTimeout)
            clearTimeout(this.idleTimeout)
        this.idleTimeout = setTimeout(() => {
            this.broadcast({ fingerType: 'wentIdle' });
            this.idling = true;
        }, this.idleTime * 1000);
    }

    handleEvent(e) {
        //IDLING MANAGEMENT
        if (this.idling) {
            this.broadcast({ fingerType: 'activeAgain' });
            this.idling = false;

        } else {
            this.startIdle();
        }

        if (e.type == 'pointerdown') this.target.setPointerCapture(e.pointerId);
        if (e.type == 'pointercancel') console.log(e);

        let handled = false;
        for (let i = 0; i < this.currentPointers.length && !handled; i++) {
            const cp = this.currentPointers[i];
            if (cp) {
                handled = cp.handleEvent(e);
                if (cp.isDone())
                    this.removeCurrPointer(i);
            }
        }
        if (!handled) {
            const cp = new SinglePointerHandler(this, e.pointerId, { ppmm: this.ppmm });
            handled = cp.handleEvent(e);
        }
        //e.preventDefault();
    }

}

/**
 * Handles events for a single pointer.
 * @private
 */
class SinglePointerHandler {
    /**
     * Creates a new SinglePointerHandler instance.
     * @param {PointerManager} parent - Parent PointerManager instance
     * @param {number} pointerId - Pointer identifier
     * @param {Object} [options] - Configuration options
     * @param {number} [options.ppmm=3] - Pixels per millimeter
     */
    constructor(parent, pointerId, options) {

        this.parent = parent;
        this.pointerId = pointerId;

        Object.assign(this, {
            ppmm: 3, // 27in screen 1920x1080 = 3 ppmm
        });
        if (options)
            Object.assign(this, options);

        this.eventHistory = new CircularBuffer(10);
        this.isActive = false;
        this.startTap = 0;
        this.threshold = 15; // 15mm

        this.eventObservers = new Map();
        this.isDown = false;
        this.done = false;

        this.stateEnum = {
            IDLE: 0,
            DETECT: 1,
            HOVER: 2,
            MOVING_START: 3,
            MOVING: 4,
            MOVING_END: 5,
            HOLD: 6,
            TAPS_DETECT: 7,
            SINGLE_TAP: 8,
            DOUBLE_TAP_DETECT: 9,
            DOUBLE_TAP: 10,
        };
        this.status = this.stateEnum.IDLE;
        this.timeout = null;
        this.holdTimeoutThreshold = 600;
        this.tapTimeoutThreshold = 100;
        this.oldDownPos = { clientX: 0, clientY: 0 };
        this.movingThreshold = 1; // 1mm
        this.idx = this.parent.addCurrPointer(this);
    }

    ///////////////////////////////////////////////////////////
    /// Utilities

    static distance(x0, y0, x1, y1) {
        return Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
    }

    distanceMM(x0, y0, x1, y1) {
        return SinglePointerHandler.distance(x0, y0, x1, y1) / this.ppmm;
    }

    ///////////////////////////////////////////////////////////
    /// Class interface

    on(eventType, obj) {
        this.eventObservers.set(eventType, obj);
    }

    off(eventType) {
        if (this.eventObservers.has(eventType)) {
            this.eventObservers.delete(eventType);
        }
    }

    ///////////////////////////////////////////////////////////
    /// Implementation stuff

    addToHistory(e) {
        this.eventHistory.push(e);
    }

    prevPointerEvent() {
        return this.eventHistory.last();
    }

    handlePointerDown(e) {
        this.startTap = e.timeStamp;
    }

    handlePointerUp(e) {
        const tapDuration = e.timeStamp - this.startTap;
    }

    isLikelySamePointer(e) {
        let result = this.pointerId == e.pointerId;
        if (!result && !this.isDown && e.type == "pointerdown") {
            const prevP = this.prevPointerEvent();
            if (prevP) {
                result = (e.pointerType == prevP.pointerType) && this.distanceMM(e.clientX, e.clientY, prevP.clientX, prevP.clientY) < this.threshold;
            }
        }
        return result;
    }

    // emit+broadcast
    emit(e) {
        if (this.eventObservers.has(e.fingerType)) {
            this.eventObservers.get(e.fingerType)[e.fingerType](e);
            if (e.defaultPrevented) return;
        }
        this.parent.broadcast(e);
    }

    // output Event, speed is computed only on pointermove
    createOutputEvent(e, type) {
        const result = e;
        result.fingerType = type;
        result.originSrc = this.originSrc;
        result.speedX = 0;
        result.speedY = 0;
        result.idx = this.idx;
        const prevP = this.prevPointerEvent();
        if (prevP && (e.type == 'pointermove')) {
            const dt = result.timeStamp - prevP.timeStamp;
            if (dt > 0) {
                result.speedX = (result.clientX - prevP.clientX) / dt * 1000.0;  // px/s
                result.speedY = (result.clientY - prevP.clientY) / dt * 1000.0;  // px/s
            }
        }
        return result;
    }

    // Finite State Machine
    processEvent(e) {
        let distance = 0;
        if (e.type == "pointerdown") {
            this.oldDownPos.clientX = e.clientX;
            this.oldDownPos.clientY = e.clientY;
            this.isDown = true;
        }
        if (e.type == "pointerup" || e.type == "pointercancel") this.isDown = false;
        if (e.type == "pointermove" && this.isDown) {
            distance = this.distanceMM(e.clientX, e.clientY, this.oldDownPos.clientX, this.oldDownPos.clientY)
        }

        if (e.type == "wheel") {
            this.emit(this.createOutputEvent(e, 'mouseWheel'));
            return;
        }

        switch (this.status) {
            case this.stateEnum.HOVER:
            case this.stateEnum.IDLE:
                if (e.type == 'pointermove') {
                    this.emit(this.createOutputEvent(e, 'fingerHover'));
                    this.status = this.stateEnum.HOVER;
                    this.originSrc = e.composedPath()[0];
                } else if (e.type == 'pointerdown') {
                    this.status = this.stateEnum.DETECT;
                    this.emit(this.createOutputEvent(e, 'fingerDown'));
                    if (e.defaultPrevented) { // An observer captured the fingerDown event
                        this.status = this.stateEnum.MOVING;
                        break;
                    }
                    this.originSrc = e.composedPath()[0];
                    this.timeout = setTimeout(() => {
                        this.emit(this.createOutputEvent(e, 'fingerHold'));
                        if (e.defaultPrevented) this.status = this.stateEnum.IDLE;
                    }, this.holdTimeoutThreshold);
                }
                break;
            case this.stateEnum.DETECT:
                if (e.type == 'pointercancel') { /// For Firefox
                    clearTimeout(this.timeout);
                    this.status = this.stateEnum.IDLE;
                    this.emit(this.createOutputEvent(e, 'fingerHold'));
                } else if (e.type == 'pointermove' && distance > this.movingThreshold) {
                    clearTimeout(this.timeout);
                    this.status = this.stateEnum.MOVING;
                    this.emit(this.createOutputEvent(e, 'fingerMovingStart'));
                } else if (e.type == 'pointerup') {
                    clearTimeout(this.timeout);
                    this.status = this.stateEnum.TAPS_DETECT;
                    this.timeout = setTimeout(() => {
                        this.status = this.stateEnum.IDLE;
                        this.emit(this.createOutputEvent(e, 'fingerSingleTap'));
                    }, this.tapTimeoutThreshold);
                }
                break;
            case this.stateEnum.TAPS_DETECT:
                if (e.type == 'pointerdown') {
                    clearTimeout(this.timeout);
                    this.status = this.stateEnum.DOUBLE_TAP_DETECT;
                    this.timeout = setTimeout(() => {
                        this.emit(this.createOutputEvent(e, 'fingerHold'));
                        if (e.defaultPrevented) this.status = this.stateEnum.IDLE;
                    }, this.tapTimeoutThreshold);
                } else if (e.type == 'pointermove' && distance > this.movingThreshold) {
                    clearTimeout(this.timeout);
                    this.status = this.stateEnum.IDLE;
                    this.emit(this.createOutputEvent(e, 'fingerHover'));
                }
                break;
            case this.stateEnum.DOUBLE_TAP_DETECT:
                if (e.type == 'pointerup' || e.type == 'pointercancel') {
                    clearTimeout(this.timeout);
                    this.status = this.stateEnum.IDLE;
                    this.emit(this.createOutputEvent(e, 'fingerDoubleTap'));
                }
                break;
            case this.stateEnum.DOUBLE_TAP_DETECT:
                if (e.type == 'pointermove' && distance > this.movingThreshold) {
                    this.status = this.stateEnum.MOVING;
                    this.emit(this.createOutputEvent(e, 'fingerMovingStart'));
                }
                break;
            case this.stateEnum.MOVING:
                if (e.type == 'pointermove') {
                    // Remain MOVING
                    this.emit(this.createOutputEvent(e, 'fingerMoving'));
                } else if (e.type == 'pointerup' || e.type == 'pointercancel') {
                    this.status = this.stateEnum.IDLE;
                    this.emit(this.createOutputEvent(e, 'fingerMovingEnd'));
                }
                break;
            default:
                console.log("ERROR " + this.status);
                console.log(e);
                break;
        }

        this.addToHistory(e);
    }

    handleEvent(e) {
        let result = false;
        if (this.isLikelySamePointer(e)) {
            this.pointerId = e.pointerId; //it's mine
            this.processEvent(e);
            result = true;
        }
        return result;
    }

    isDone() {
        return this.status == this.stateEnum.IDLE;
    }

}

/**
 * A fixed-size circular buffer for efficient event history management.
 * Provides FIFO operations with automatic overwriting of oldest entries.
 * @private
 */
class CircularBuffer {
    /**
     * Creates a new CircularBuffer instance.
     * @param {number} capacity - Maximum number of elements
     * @throws {TypeError} If capacity is not a positive integer
     */
    constructor(capacity) {
        if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 1) {
            throw new TypeError("Invalid capacity");
        }

        this.buffer = new Array(capacity);
        this.capacity = capacity;
        this.first = 0;    // Index of first element
        this.size = 0;     // Current number of elements
    }

    /**
     * Removes all elements from the buffer.
     */
    clear() {
        this.first = 0;
        this.size = 0;
    }

    /**
     * Checks if the buffer is empty.
     * @returns {boolean} True if empty
     */
    empty() {
        return this.size === 0;
    }

    /**
     * Gets the first (oldest) element.
     * @returns {*} First element or null if empty
     */
    first() {
        return this.size > 0 ? this.buffer[this.first] : null;
    }

    /**
     * Gets the last (newest) element.
     * @returns {*} Last element or null if empty
     */
    last() {
        return this.size > 0 ? this.buffer[(this.first + this.size - 1) % this.capacity] : null;
    }

    /**
     * Adds an element to the front, replacing the last if full.
     * @param {*} value - Value to add
     */
    enqueue(value) {
        this.first = (this.first > 0) ? this.first - 1 : this.capacity - 1;
        this.buffer[this.first] = value;

        if (this.size < this.capacity) {
            this.size++;
        }
    }

    /**
     * Adds an element to the end, replacing the first if full.
     * @param {*} value - Value to add
     */
    push(value) {
        const index = (this.first + this.size) % this.capacity;
        this.buffer[index] = value;

        if (this.size === this.capacity) {
            // Buffer is full, advance first position
            this.first = (this.first + 1) % this.capacity;
        } else {
            this.size++;
        }
    }

    /**
     * Removes and returns the last element.
     * @returns {*} Removed element
     * @throws {RangeError} If buffer is empty
     */
    pop() {
        if (this.size === 0) {
            throw new RangeError("Dequeue on empty buffer");
        }

        const index = (this.first + this.size - 1) % this.capacity;
        const value = this.buffer[index];
        this.size--;

        return value;
    }

    /**
     * Removes and returns the first element.
     * @returns {*} Removed element
     * @throws {RangeError} If buffer is empty
     */
    shift() {
        if (this.size === 0) {
            throw new RangeError("Shift on empty buffer");
        }

        const value = this.buffer[this.first];
        this.first = (this.first + 1) % this.capacity;
        this.size--;

        return value;
    }

    /**
     * Gets elements by index or range.
     * @param {number} start - Start index
     * @param {number} [end] - End index (inclusive)
     * @returns {*|Array} Single element or array of elements
     * @throws {TypeError|RangeError} If indices are invalid
     */
    get(start, end) {
        // Special case for empty buffer with valid indices
        if (this.size === 0 && start === 0 && (end === undefined || end === 0)) {
            return [];
        }

        // Validate start index
        if (typeof start !== "number" || !Number.isInteger(start) || start < 0) {
            throw new TypeError("Invalid start value");
        }

        if (start >= this.size) {
            throw new RangeError("Start index past end of buffer: " + start);
        }

        // Return single element if no end index
        if (end === undefined) {
            return this.buffer[(this.first + start) % this.capacity];
        }

        // Validate end index
        if (typeof end !== "number" || !Number.isInteger(end) || end < 0) {
            throw new TypeError("Invalid end value");
        }

        if (end >= this.size) {
            throw new RangeError("End index past end of buffer: " + end);
        }

        // Return range of elements
        const result = [];
        for (let i = start; i <= end; i++) {
            result.push(this.buffer[(this.first + i) % this.capacity]);
        }

        return result;
    }

    /**
     * Converts the buffer to an array.
     * @returns {Array} Array containing all elements in order
     */
    toArray() {
        if (this.size === 0) return [];
        return this.get(0, this.size - 1);
    }
}

export { PointerManager }
