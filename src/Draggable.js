/**
 * The Draggable class enables an element to be dragged and moved around within its parent element.
 * It creates a draggable container with a handle that can be used to initiate the dragging action.
 * The draggable element is positioned absolutely within its parent container and can be customized
 * through various options.
 * 
 * The class requires either a top or bottom position and either a left or right position to be 
 * specified through the options parameter. These determine the initial position of the draggable
 * element within its parent container. The default positioning is bottom=20 and right=20.
 * 
 * Features:
 * - Flexible positioning using top/bottom and left/right coordinates
 * - Customizable handle size and appearance
 * - Automatic position updates on window resize
 * - Touch-enabled dragging support
 * - Configurable spacing between handle and content
 * 
 * 
 */
class Draggable {
    /**
     * Creates a new Draggable instance.
     * 
     * @param {HTMLElement} element - The element to be made draggable
     * @param {HTMLElement|string} parent - The parent element where the draggable container will be appended.
     *                                     Can be either an HTMLElement or a CSS selector string
     * @param {Object} [options] - Configuration options for the draggable element
     * @param {number} [options.top] - The initial top position in pixels. Mutually exclusive with bottom
     * @param {number} [options.bottom=20] - The initial bottom position in pixels. Mutually exclusive with top
     * @param {number} [options.left] - The initial left position in pixels. Mutually exclusive with right
     * @param {number} [options.right=20] - The initial right position in pixels. Mutually exclusive with left
     * @param {number} [options.handleSize=10] - The size of the drag handle in pixels
     * @param {number} [options.handleGap=5] - The gap between the handle and the draggable content in pixels
     * @param {number} [options.zindex=200] - The z-index of the draggable container
     * @param {string} [options.handleColor='#f0f0f0b3'] - The background color of the handle (supports rgba)
     */
    constructor(element, parent, options) {
        options = Object.assign({
            top: null,
            bottom: 20,
            left: null,
            right: 20,
            handleSize: 10,
            handleGap: 5,
            zindex: 200,
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
        this.container.style = `display: flex; gap:${this.handleGap}px; position: absolute; z-index: ${this.zindex}; touch-action: none; visibility: visible;`;
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

    /**
     * Appends an HTML element to the draggable container and updates its position.
     * @param {HTMLElement} element - The element to append to the draggable container
     */
    appendChild(e) {
        this.container.appendChild(e);
        this.updatePos();
    }

    /**
     * Updates the position of the draggable container based on its current options and parent dimensions.
     * This method is called automatically on window resize and when elements are appended.
     * @private
     */
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

    /**
     * Sets up the drag event listeners for the handle.
     * Manages pointer events for drag start, drag, and drag end operations.
     * @private
     */
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