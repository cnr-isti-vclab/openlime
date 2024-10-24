/**
The Draggable class enables an element to be dragged and moved around within its parent element. 
It creates a draggable container with a handle that can be used to initiate the dragging action. The class accepts two 
parameters: `parent`, which represents the parent element where the draggable container will be appended, and `options`, 
an optional object that allows customization of the draggable behavior.

The class supports flexible positioning of the draggable container within its parent element. The `options` parameter 
can specify the positioning using properties such as `top`, `bottom`, `left`, and `right`. The default values for these properties 
are right=20 bottom=20, and at least one of the `top` or `bottom` properties and one of the `left` or `right` properties must be provided. 
If an unknown drag position is detected (neither `top` nor `bottom` specified, but either `left` or `right` is
provided), an error is thrown.

The class creates a container element and a handle element within it. The container is positioned absolutely 
based on the specified positioning properties. It also has a fixed size (defaulting to 10 pixels) and a flexible 
layout with a `handleGap` (defaulting to 5 pixels) between its child elements. The handle element is a small square with rounded 
corners and a semi-transparent background color.

The class provides an appendChild method that allows elements to be appended to the draggable container.
*/

class Draggable {
    /**
      * Enables an element to be dragged and moved around within its parent element.
      * An object literal with `options` can be specified.
    *
    * @param {HTMLElement} element the element to be added to the draggable container
    * @param {HTMLElement} parent the element where the draggable container will be appended
    * @param {Object} options an object literal with options.
      * @param {number} options.top the initial CSS top position of the draggable container
      * @param {number} options.bottom=20 the initial CSS bottom position of the draggable container
      * @param {number} options.left the initial CSS left position of the draggable container
      * @param {number} options.right=20 the initial CSS right position of the draggable container
    * @param {number} options.handleSize=10 the size of the handle in pixels
    * @param {number} options.handleGap=5 the gap between the handle and the element appended to the draggable container
    * @param {string} options.handleColor='#f0f0f0b3' the semi-transparent background color of the handle
      */
    constructor(element, parent, options) {
        options = Object.assign({
            top: null,
            bottom: 20,
            left: null,
            right: 20,
            handleSize: 10,
            handleGap: 5,
            handleColor: '#f0f0f0b3' // rgba(240, 240, 240, 0.7)
        }, options);
        Object.assign(this, options);
        this.element = element;
        this.parent = parent;
        if (typeof (this.parent) == 'string')
            this.parent = document.querySelector(this.parent);

        if (this.left) this.right = null;
        if (this.top) this.bottom = null;

        // Disable context menu
        if (!('setCtxMenu' in window)) {
            window.addEventListener("contextmenu", e => e.preventDefault());
            window.setCtxMenu = true;
        }

        this.container = document.createElement('div');
        this.container.classList.add('openlime-draggable');
        this.container.style = `display: flex; gap:${this.handleGap}px; position: absolute; z-index: 200; touch-action: none; visibility: visible;`;
        this.handle = document.createElement('div');
        this.handle.style = `border-radius: 4px; background-color: ${this.handleColor}; padding: 0; width: ${this.handleSize}px; height: ${this.handleSize}px; z-index: 205;`;
        this.container.appendChild(this.handle);
        this.parent.appendChild(this.container);

        this.dragEvents();
        this.element.style.position = 'unset';

        this.appendChild(this.element);

        addEventListener("resize", (event) => {
            this.updatePos();
        });
    }

    /** Append an HTML element `e` to the draggable container */
    appendChild(e) {
        this.container.appendChild(e);
        this.updatePos();
    }

    updatePos() {
        const w = this.container.offsetWidth;
        const h = this.container.offsetHeight;
        let t = 0;
        let l = 0;
        if (this.top) t = this.top;
        if (this.bottom) t = this.parent.offsetHeight - this.bottom - h;
        if (this.left) l = this.left;
        if (this.right) l = this.parent.offsetWidth - this.right - w;
        this.container.style.top = `${t}px`;
        this.container.style.left = `${l}px`;
    }

    /** @ignore */
    dragEvents() {

        let offsetX, offsetY;
        const self = this;

        this.handle.addEventListener("pointerdown", dragStart);
        document.addEventListener("pointerup", dragEnd);

        function dragStart(e) {
            e.preventDefault();
            self.container.style.opacity = 0.6;
            offsetX = e.clientX - self.container.offsetLeft;
            offsetY = e.clientY - self.container.offsetTop;
            document.addEventListener("pointermove", drag);
        }

        function drag(e) {
            e.preventDefault();
            self.container.style.opacity = 0.6;
            self.container.style.left = e.clientX - offsetX + "px";
            self.container.style.top = e.clientY - offsetY + "px";
        }

        function dragEnd() {
            self.container.style.opacity = 1.0;
            document.removeEventListener("pointermove", drag);
        }
    }
}

export { Draggable }