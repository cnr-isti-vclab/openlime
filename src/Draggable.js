/**
 * Draggable class that enables HTML elements to be moved within a parent container.
 * 
 * This class creates a draggable container with a handle and attaches the specified
 * element to it. The element can then be dragged around its parent container using
 * the handle, providing an interactive UI element for repositioning content.
 * 
 * Features:
 * - Flexible positioning using top/bottom and left/right coordinates
 * - Customizable handle size, color, and appearance
 * - Maintains position relative to parent container edges on window resize
 * - Touch-enabled with pointer events support for multi-device compatibility
 * - Smooth drag animations with visual feedback during movement
 * - Boundary constraints within the parent container
 * 
 * @example
 * // Create a draggable element at the bottom-right corner
 * const element = document.getElementById('my-element');
 * const parent = document.querySelector('.parent-container');
 * const draggable = new Draggable(element, parent, {
 *   bottom: 20,
 *   right: 20,
 *   handleColor: 'rgba(100, 150, 200, 0.7)'
 * });
 */
class Draggable {
    /**
     * Creates a new Draggable instance.
     * 
     * @param {HTMLElement} element - The element to be made draggable
     * @param {HTMLElement|string} parent - The parent element where the draggable container will be appended.
     *                                     Can be either an HTMLElement or a CSS selector string
     * @param {Object} [options={}] - Configuration options for the draggable element
     * @param {number|null} [options.top=null] - The initial top position in pixels. Mutually exclusive with bottom
     * @param {number|null} [options.bottom=20] - The initial bottom position in pixels. Mutually exclusive with top
     * @param {number|null} [options.left=null] - The initial left position in pixels. Mutually exclusive with right
     * @param {number|null} [options.right=20] - The initial right position in pixels. Mutually exclusive with left
     * @param {number} [options.handleSize=10] - The size of the drag handle in pixels
     * @param {number} [options.handleGap=5] - The gap between the handle and the draggable content in pixels
     * @param {number} [options.zindex=200] - The z-index of the draggable container
     * @param {string} [options.handleColor='#f0f0f0b3'] - The background color of the handle (supports rgba)
     * @param {number} [options.dragOpacity=0.6] - Opacity of the element while being dragged (between 0 and 1)
     */
    constructor(element, parent, options = {}) {
        // Set default options
        this.options = {
            top: null,
            bottom: 20,
            left: null,
            right: 20,
            handleSize: 10,
            handleGap: 5,
            zindex: 200,
            handleColor: '#f0f0f0b3', // rgba(240, 240, 240, 0.7)
            dragOpacity: 0.6
        };
        
        // Merge user options with defaults
        Object.assign(this.options, options);
        
        // Store element and parent references
        this.element = element;
        this.parent = typeof parent === 'string' ? document.querySelector(parent) : parent;
        
        if (!this.element || !this.parent) {
            throw new Error('Draggable requires valid element and parent');
        }
        
        // Handle positioning priority
        if (this.options.left !== null) this.options.right = null;
        if (this.options.top !== null) this.options.bottom = null;
        
        // Disable context menu globally if not already disabled
        this.setupContextMenu();
        
        // Create container and handle
        this.createElements();
        
        // Setup event listeners for dragging
        this.setupDragEvents();
        
        // Append element to container
        this.appendChild(this.element);
        
        // Setup resize handling
        this.setupResizeHandler();
    }
    
    /**
     * Disables the context menu globally if not already disabled.
     * @private
     */
    setupContextMenu() {
        if (!window.setCtxMenu) {
            window.addEventListener("contextmenu", e => e.preventDefault());
            window.setCtxMenu = true;
        }
    }
    
    /**
     * Creates the draggable container and handle elements.
     * @private
     */
    createElements() {
        const { handleGap, zindex, handleColor, handleSize } = this.options;
        
        // Create container element
        this.container = document.createElement('div');
        this.container.classList.add('openlime-draggable');
        this.container.style.display = 'flex';
        this.container.style.gap = `${handleGap}px`;
        this.container.style.position = 'absolute';
        this.container.style.zIndex = zindex;
        this.container.style.touchAction = 'none';
        this.container.style.visibility = 'visible';
        
        // Create handle element
        this.handle = document.createElement('div');
        this.handle.style.borderRadius = '4px';
        this.handle.style.backgroundColor = handleColor;
        this.handle.style.padding = '0';
        this.handle.style.width = `${handleSize}px`;
        this.handle.style.height = `${handleSize}px`;
        this.handle.style.zIndex = zindex + 5;
        this.handle.style.cursor = 'grab';
        
        // Assemble elements
        this.container.appendChild(this.handle);
        this.parent.appendChild(this.container);
    }
    
    /**
     * Sets up event listeners for window resize.
     * @private
     */
    setupResizeHandler() {
        // Use debounced resize handler to improve performance
        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.updatePosition(), 100);
        });
    }
    
    /**
     * Sets up the drag event listeners for the handle.
     * Manages pointer events for drag operations.
     * @private
     */
    setupDragEvents() {
        let offsetX, offsetY;
        let isDragging = false;
        
        // Use bound methods to maintain this context
        const dragStart = (e) => {
            e.preventDefault();
            
            // Set dragging state
            isDragging = true;
            this.container.style.opacity = this.options.dragOpacity;
            this.handle.style.cursor = 'grabbing';
            
            // Calculate offsets based on pointer position
            offsetX = e.clientX - this.container.offsetLeft;
            offsetY = e.clientY - this.container.offsetTop;
            
            // Add move event listener
            document.addEventListener("pointermove", drag);
        };
        
        const drag = (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            // Calculate new position
            const newLeft = Math.max(0, Math.min(
                e.clientX - offsetX,
                this.parent.offsetWidth - this.container.offsetWidth
            ));
            
            const newTop = Math.max(0, Math.min(
                e.clientY - offsetY,
                this.parent.offsetHeight - this.container.offsetHeight
            ));
            
            // Update position
            this.container.style.left = `${newLeft}px`;
            this.container.style.top = `${newTop}px`;
            
            // Update the option values based on new position
            this.options.left = newLeft;
            this.options.right = null;
            this.options.top = newTop;
            this.options.bottom = null;
        };
        
        const dragEnd = () => {
            if (!isDragging) return;
            
            // Reset visual state
            this.container.style.opacity = '1.0';
            this.handle.style.cursor = 'grab';
            
            // Clear dragging state
            isDragging = false;
            
            // Remove move event listener
            document.removeEventListener("pointermove", drag);
        };
        
        // Attach event listeners
        this.handle.addEventListener("pointerdown", dragStart);
        document.addEventListener("pointerup", dragEnd);
        document.addEventListener("pointercancel", dragEnd);
    }
    
    /**
     * Appends an HTML element to the draggable container and updates its position.
     * @param {HTMLElement} element - The element to append to the draggable container
     * @returns {Draggable} This instance for method chaining
     */
    appendChild(element) {
        if (element) {
            // Ensure the element has proper positioning
            element.style.position = 'unset';
            this.container.appendChild(element);
            this.updatePosition();
        }
        return this;
    }
    
    /**
     * Updates the position of the draggable container based on its current options and parent dimensions.
     * This method is called automatically on window resize and when elements are appended.
     * @returns {Draggable} This instance for method chaining
     */
    updatePosition() {
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;
        const parentWidth = this.parent.offsetWidth;
        const parentHeight = this.parent.offsetHeight;
        
        let top = 0;
        let left = 0;
        
        // Calculate top/bottom position
        if (this.options.top !== null) {
            top = this.options.top;
        } else if (this.options.bottom !== null) {
            top = parentHeight - this.options.bottom - containerHeight;
        }
        
        // Calculate left/right position
        if (this.options.left !== null) {
            left = this.options.left;
        } else if (this.options.right !== null) {
            left = parentWidth - this.options.right - containerWidth;
        }
        
        // Ensure the element stays within parent bounds
        top = Math.max(0, Math.min(top, parentHeight - containerHeight));
        left = Math.max(0, Math.min(left, parentWidth - containerWidth));
        
        // Apply position
        this.container.style.top = `${top}px`;
        this.container.style.left = `${left}px`;
        
        return this;
    }
    
    /**
     * Shows the draggable element if it's hidden.
     * @returns {Draggable} This instance for method chaining
     */
    show() {
        this.container.style.visibility = 'visible';
        return this;
    }
    
    /**
     * Hides the draggable element.
     * @returns {Draggable} This instance for method chaining
     */
    hide() {
        this.container.style.visibility = 'hidden';
        return this;
    }
    
    /**
     * Changes the handle color.
     * @param {string} color - New color for the handle (hex, rgb, rgba)
     * @returns {Draggable} This instance for method chaining
     */
    setHandleColor(color) {
        this.options.handleColor = color;
        this.handle.style.backgroundColor = color;
        return this;
    }
}

export { Draggable }