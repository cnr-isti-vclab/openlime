import { Annotation } from './Annotation.js';
import { Layer } from './Layer.js'
import { addSignals } from './Signals.js';

/**
 * @typedef {Object} LayerAnnotationOptions
 * @property {string} [style] - CSS styles for annotation rendering
 * @property {string|Annotation[]} [annotations=[]] - URL of JSON annotation data or array of annotations
 * @property {boolean} [overlay=true] - Whether annotations render as overlay
 * @property {Set<string>} [selected=new Set()] - Set of selected annotation IDs
 * @property {Object} [annotationsListEntry=null] - UI entry for annotations list
 * @extends LayerOptions
 */

/**
 * LayerAnnotation provides functionality for displaying and managing annotations overlaid on other layers.
 * It supports both local and remote annotation data, selection management, and UI integration.
 * 
 * Features:
 * - Display of text, graphics, and glyph annotations
 * - Remote annotation loading via JSON/HTTP
 * - Selection management
 * - Visibility toggling per annotation
 * - UI integration with annotation list
 * - Annotation event handling
 * 
 * The layer automatically handles:
 * - Annotation data loading and parsing
 * - UI synchronization
 * - Visibility states
 * - Selection states
 * - Event propagation
 * 
 * @extends Layer
 * @fires LayerAnnotation#selected - Fired when annotation selection changes, with selected annotation as parameter
 * @fires LayerAnnotation#loaded - Fired when annotations are loaded
 * @fires Layer#update - Inherited from Layer, fired when redraw needed
 * @fires Layer#ready - Inherited from Layer, fired when layer is ready
 * 
 * @example
 * ```javascript
 * // Create annotation layer from remote JSON
 * const annoLayer = new OpenLIME.LayerAnnotation({
 *   annotations: 'https://example.com/annotations.json',
 *   style: '.annotation { color: red; }',
 *   overlay: true
 * });
 * 
 * // Listen for selection changes
 * annoLayer.addEvent('selected', (annotation) => {
 *   console.log('Selected annotation:', annotation.label);
 * });
 * 
 * // Add to viewer
 * viewer.addLayer('annotations', annoLayer);
 * ```
 */
class LayerAnnotation extends Layer { //FIXME CustomData Object template {name: { label: defaultValue: type:number,enum,string,boolean min: max: enum:[] }}
	/**
	 * Instantiates a LayerAnnotation object.
	 * @param {Object} [options] An object literal with options that inherits from {@link Layer}.
	 * @param {string} options.style Properties to style annotations.
		 * @param {(string|Array)} options.annotations The URL of the annotation data (JSON file or HTTP GET Request to an annotation server) or an array of annotations.
	 */
	constructor(options) {
		options = Object.assign({
			// geometry: null,  //unused, might want to store here the quads/shapes for opengl rendering
			style: null,    //straightforward for svg annotations, to be defined or opengl rendering
			annotations: [],
			selected: new Set,
			overlay: true,
			annotationsListEntry: null, //TODO: horrible name for the interface list of annotations
		}, options);
		super(options);

		if (typeof (this.annotations) == "string") { //assumes it is an URL
			(async () => { await this.loadAnnotations(this.annotations); })();
		}
	}

	/**
	 * Helper method to get idx from annotation data
	 * @param {Annotation} annotation - The annotation object
	 * @returns {number|string|null} The idx value from data.idx
	 * @private
	 */
	getAnnotationIdx(annotation) {
		return annotation.data && annotation.data.idx !== undefined ? annotation.data.idx : null;
	}

	/**
	 * Helper method to set idx in annotation data
	 * @param {Annotation} annotation - The annotation object
	 * @param {number|string} idx - The idx value to set
	 * @private
	 */
	setAnnotationIdx(annotation, idx) {
		if (!annotation.data) {
			annotation.data = {};
		}
		annotation.data.idx = idx;
	}

	/**
	 * Loads annotations from a URL
	 * @param {string} url - URL to fetch annotations from (JSON format)
	 * @fires LayerAnnotation#loaded
	 * @fires Layer#update
	 * @fires Layer#ready
	 * @private
	 * @async
	 */
	async loadAnnotations(url) {
		const headers = new Headers();
		headers.append('pragma', 'no-cache');
		headers.append('cache-control', 'no-cache');
		var response = await fetch(url, {
			method: 'GET',
			headers: headers,
		});
		if (!response.ok) {
			this.status = "Failed loading " + this.url + ": " + response.statusText;
			return;
		}
		this.annotations = await response.json();
		if (this.annotations.status == 'error') {
			alert("Failed to load annotations: " + this.annotations.msg);
			return;
		}
		if (!this.annotations || this.annotations.length === 0) {
			this.status = "No annotations found";
			return;
		}
		//this.annotations = this.annotations.map(a => '@context' in a ? Annotation.fromJsonLd(a): a);
		this.annotations = this.annotations.map((a, index) => {
			const annotation = new Annotation(a);

			// Ensure idx is set in data, using the array index if not provided
			const currentIdx = this.getAnnotationIdx(annotation);
			if (currentIdx === undefined || currentIdx === null) {
				this.setAnnotationIdx(annotation, index);
			}
			annotation.published = (a.publish == 1);
			return annotation;
		});

		for (let a of this.annotations)
			if (a.publish != 1)
				a.visible = false;

		// Sort by idx if available, otherwise maintain original order
		this.annotations.sort((a, b) => {
			const aIdx = this.getAnnotationIdx(a);
			const bIdx = this.getAnnotationIdx(b);

			if (aIdx !== null && aIdx !== undefined && bIdx !== null && bIdx !== undefined) {
				// Convert to numbers for proper numeric sorting
				const aNum = parseInt(aIdx);
				const bNum = parseInt(bIdx);
				if (!isNaN(aNum) && !isNaN(bNum)) {
					return aNum - bNum;
				}
				// If not numbers, compare as strings
				return String(aIdx).localeCompare(String(bIdx));
			}
			// Fallback to label comparison if idx is not available
			return (a.label || '').localeCompare(b.label || '');
		});

		if (this.annotationsListEntry)
			this.createAnnotationsList();

		this.emit('update');
		this.status = 'ready';
		this.emit('ready');
		this.emit('loaded');
	}

	/**
 * Creates a new annotation and adds it to the layer
 * @param {Annotation} [annotation] - Optional pre-configured annotation
 * @returns {Annotation} The newly created annotation
 * @private
 */
	newAnnotation(annotation) {
		if (!annotation) {
			// Set idx to the next available index
			const maxIdx = Math.max(...this.annotations.map(a => {
				const idx = this.getAnnotationIdx(a);
				return (idx !== null && idx !== undefined) ? parseInt(idx) || 0 : 0;
			}), -1);
			annotation = new Annotation({ data: { idx: maxIdx + 1 } });
		} else {
			const currentIdx = this.getAnnotationIdx(annotation);
			if (currentIdx === null || currentIdx === undefined) {
				// Ensure new annotations have an idx
				const maxIdx = Math.max(...this.annotations.map(a => {
					const idx = this.getAnnotationIdx(a);
					return (idx !== null && idx !== undefined) ? parseInt(idx) || 0 : 0;
				}), -1);
				this.setAnnotationIdx(annotation, maxIdx + 1);
			}
		}

		this.annotations.push(annotation);

		// Recreate the entire dropdown list to include the new annotation with correct structure
		if (this.annotationsListEntry && this.annotationsListEntry.element && this.annotationsListEntry.element.parentElement) {
			const list = this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
			if (list) {
				// Store current dropdown state
				const selectContainer = list.querySelector('.openlime-annotations-select');
				const wasActive = selectContainer && selectContainer.classList.contains('active');

				// Cleanup previous event listeners if they exist
				if (selectContainer && selectContainer._cleanup) {
					selectContainer._cleanup();
				}

				// Recreate the entire annotations list
				this.createAnnotationsList();

				// Restore dropdown state if it was open
				if (wasActive) {
					const newSelectContainer = list.querySelector('.openlime-annotations-select');
					if (newSelectContainer) {
						newSelectContainer.classList.add('active');
					}
				}
			}
		}

		this.clearSelected();
		//this.setSelected(annotation);
		return annotation;
	}

	/**
	 * Creates the UI entry for the annotations list
	 * @returns {Object} Configuration object for annotations list UI
	 * @private
	 */
	annotationsEntry() {
		return this.annotationsListEntry = {
			html: '',
			list: [], //will be filled later.
			classes: 'openlime-annotations',
			status: () => 'active',
			oncreate: () => {
				if (Array.isArray(this.annotations))
					this.createAnnotationsList();
			}
		}
	}

	/**
 * Creates the complete annotations list UI as a dropdown menu with precise positioning
 * @private
 */
	createAnnotationsList() {
		// Create dropdown HTML structure
		let html = `
        <div class="openlime-select openlime-annotations-select">
            <div class="openlime-select-button openlime-annotations-button">
                <span class="openlime-annotations-selected-text">Select an annotation</span>
            </div>
            <ul class="openlime-select-menu openlime-annotations-menu">
                ${this.annotations.map(a => {
			const idx = this.getAnnotationIdx(a);
			const displayText = a.label || `Annotation ${(idx !== null && idx !== undefined) ? parseInt(idx) : ''}`;
			return `<li data-annotation="${a.id}" class="openlime-annotations-option ${a.visible == 0 ? 'hidden' : ''}" data-visible="${a.visible !== false}">
                        <span class="openlime-annotations-text">${displayText}</span>
                        <div class="openlime-annotations-visibility">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="openlime-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="openlime-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        </div>
                    </li>`;
		}).join('\n')}
            </ul>
        </div>`;

		let list = this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		list.innerHTML = html;

		// Get references to elements
		const selectContainer = list.querySelector('.openlime-annotations-select');
		const button = list.querySelector('.openlime-annotations-button');
		const menu = list.querySelector('.openlime-annotations-menu');
		const selectedText = list.querySelector('.openlime-annotations-selected-text');
		const options = list.querySelectorAll('.openlime-annotations-option');
		const layersContent = document.querySelector('.openlime-layers-content');

		// Function to position dropdown menu precisely
		const positionDropdown = () => {
			const buttonRect = button.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const viewportWidth = window.innerWidth;

			// Calculate dropdown dimensions
			const dropdownMaxHeight = 180; // Max height from CSS
			const actualHeight = Math.min(dropdownMaxHeight, options.length * 18); // Each item ~18px

			// Preferred position: directly below the button
			let top = buttonRect.bottom;
			let left = buttonRect.left;
			let width = buttonRect.width;
			let showAbove = false;

			// Check if dropdown would go off screen vertically
			if (top + actualHeight > viewportHeight - 10) {
				// Check if there's enough space above
				if (buttonRect.top - actualHeight > 10) {
					// Show above button
					top = buttonRect.top - actualHeight;
					showAbove = true;
				} else {
					// Keep below but adjust height if needed
					const availableHeight = viewportHeight - top - 10;
					if (availableHeight < actualHeight) {
						menu.style.maxHeight = `${availableHeight}px`;
					}
				}
			}

			// Check if dropdown would go off screen horizontally
			if (left + width > viewportWidth - 10) {
				left = Math.max(10, viewportWidth - width - 10);
			}

			// Apply positioning with precise alignment
			menu.style.top = `${top}px`;
			menu.style.left = `${left}px`;
			menu.style.width = `${width}px`;
			menu.style.minWidth = `${width}px`;

			// Adjust border radius based on position
			if (showAbove) {
				menu.style.borderRadius = '6px 6px 0 0';
				button.style.borderRadius = '0 0 6px 6px';
			} else {
				menu.style.borderRadius = '0 0 6px 6px';
				button.style.borderRadius = '6px 6px 0 0';
			}
		};

		// Handle dropdown toggle
		button.addEventListener('click', (e) => {
			e.stopPropagation();

			const isActive = selectContainer.classList.contains('active');

			if (!isActive) {
				// Opening dropdown
				selectContainer.classList.add('active');
				layersContent.classList.add('dropdown-open');

				// Position dropdown immediately and precisely
				requestAnimationFrame(() => {
					positionDropdown();
				});
			} else {
				// Closing dropdown
				selectContainer.classList.remove('active');
				layersContent.classList.remove('dropdown-open');

				// Reset button border radius
				button.style.borderRadius = '6px';
				menu.style.maxHeight = '180px'; // Reset max height
			}
		});

		// Handle option selection and visibility toggle
		menu.addEventListener('click', (e) => {
			e.stopPropagation();

			// Check if clicked on visibility icon
			const visibilityDiv = e.target.closest('.openlime-annotations-visibility');
			if (visibilityDiv) {
				e.preventDefault();
				const option = visibilityDiv.closest('.openlime-annotations-option');
				const id = option.getAttribute('data-annotation');
				const anno = this.getAnnotationById(id);

				// Toggle visibility
				anno.visible = !anno.visible;
				anno.needsUpdate = true;

				// Update UI
				option.classList.toggle('hidden', !anno.visible);
				option.setAttribute('data-visible', anno.visible);

				this.emit('update');
				return;
			}

			// Handle annotation selection
			const option = e.target.closest('.openlime-annotations-option');
			if (option) {
				const id = option.getAttribute('data-annotation');
				const anno = this.getAnnotationById(id);

				// Update selected text
				const text = option.querySelector('.openlime-annotations-text').textContent;
				selectedText.textContent = text;

				// Clear previous selection and set new one
				options.forEach(opt => opt.classList.remove('selected'));
				option.classList.add('selected');

				// Close dropdown
				selectContainer.classList.remove('active');
				layersContent.classList.remove('dropdown-open');

				// Reset button border radius
				button.style.borderRadius = '6px';
				menu.style.maxHeight = '180px'; // Reset max height

				// Clear and set selection
				this.clearSelected();
				this.setSelected(anno, true);
			}
		});

		// Close dropdown when clicking outside
		const closeDropdown = (e) => {
			if (!selectContainer.contains(e.target)) {
				selectContainer.classList.remove('active');
				layersContent.classList.remove('dropdown-open');
				button.style.borderRadius = '6px';
				menu.style.maxHeight = '180px';
			}
		};

		// Event listeners for closing dropdown
		document.addEventListener('click', closeDropdown);

		// Close dropdown on scroll or resize and reposition if still open
		const handleScrollResize = () => {
			if (selectContainer.classList.contains('active')) {
				// Try to reposition, or close if not possible
				requestAnimationFrame(() => {
					positionDropdown();
				});
			}
		};

		window.addEventListener('resize', handleScrollResize);
		layersContent.addEventListener('scroll', handleScrollResize);

		// Reposition dropdown when layers menu is moved
		const observer = new MutationObserver(() => {
			if (selectContainer.classList.contains('active')) {
				requestAnimationFrame(() => {
					positionDropdown();
				});
			}
		});

		observer.observe(layersContent.parentElement, {
			attributes: true,
			attributeFilter: ['class', 'style']
		});

		// Store cleanup function
		selectContainer._cleanup = () => {
			document.removeEventListener('click', closeDropdown);
			window.removeEventListener('resize', handleScrollResize);
			layersContent.removeEventListener('scroll', handleScrollResize);
			observer.disconnect();
		};
	}

	/**
	 * Creates a single annotation entry for the UI
	 * @param {Annotation} annotation - The annotation to create an entry for
	 * @returns {string} HTML string for the annotation entry
	 * @private
	 */
	createAnnotationEntry(a) {
		const idx = this.getAnnotationIdx(a);
		const displayText = a.label || `Annotation ${(idx !== null && idx !== undefined) ? parseInt(idx) : ''}`;
		return `<a href="#" data-annotation="${a.id}" class="openlime-entry ${a.visible == 0 ? 'hidden' : ''}">${displayText}
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="openlime-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="openlime-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
			</a>`;
	}

	/**
	 * Retrieves an annotation by its ID
	 * @param {string} id - Annotation identifier
	 * @returns {Annotation|null} The found annotation or null if not found
	 */
	getAnnotationById(id) {
		for (const anno of this.annotations)
			if (anno.id == id)
				return anno;
		return null;
	}

	/**
	 * Retrieves an annotation by its index
	 * @param {number|string} idx - Annotation index
	 * @returns {Annotation|null} The found annotation or null if not found
	 */
	getAnnotationByIdx(idx) {
		for (const anno of this.annotations) {
			const annoIdx = this.getAnnotationIdx(anno);
			// Compare both as strings and numbers to handle different data types
			if (annoIdx == idx || (parseInt(annoIdx) === parseInt(idx) && !isNaN(parseInt(idx))))
				return anno;
		}
		return null;
	}

	/**
	 * Clears all annotation selections
	 * @private
	 */
	clearSelected() {
		// Check if DOM elements are available
		if (!this.annotationsListEntry || !this.annotationsListEntry.element || !this.annotationsListEntry.element.parentElement) {
			// Clear internal selection only
			this.selected.clear();
			return;
		}

		// Clear dropdown selections
		const list = this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		if (!list) {
			this.selected.clear();
			return;
		}

		const options = list.querySelectorAll('.openlime-annotations-option');
		const selectedText = list.querySelector('.openlime-annotations-selected-text');

		// Remove selected class from all options
		options.forEach(opt => opt.classList.remove('selected'));

		// Reset dropdown text
		if (selectedText) {
			selectedText.textContent = "Select an annotation";
		}

		// Clear internal selection
		this.selected.clear();
	}

	/**
	 * Updates the dropdown selection when annotation is selected programmatically
	 * @param {Annotation} anno - The annotation to select/deselect
	 * @param {boolean} [on=true] - Whether to select (true) or deselect (false)
	 * @fires LayerAnnotation#selected
	 */
	setSelected(anno, on = true) {
		// Check if DOM elements are available
		if (!this.annotationsListEntry || !this.annotationsListEntry.element || !this.annotationsListEntry.element.parentElement) {
			// Update internal selection only
			if (on) {
				this.selected.add(anno.id);
			} else {
				this.selected.delete(anno.id);
			}
			this.emit('selected', anno);
			return;
		}

		// Update dropdown selection
		const list = this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		if (!list) {
			// Update internal selection only
			if (on) {
				this.selected.add(anno.id);
			} else {
				this.selected.delete(anno.id);
			}
			this.emit('selected', anno);
			return;
		}

		const options = list.querySelectorAll('.openlime-annotations-option');
		const selectedText = list.querySelector('.openlime-annotations-selected-text');

		if (on) {
			// Clear previous selections
			options.forEach(opt => opt.classList.remove('selected'));

			// Find and select the correct option
			const targetOption = list.querySelector(`[data-annotation="${anno.id}"]`);
			if (targetOption) {
				targetOption.classList.add('selected');
				const text = targetOption.querySelector('.openlime-annotations-text').textContent;
				if (selectedText) {
					selectedText.textContent = text;
				}
			}

			this.selected.add(anno.id);
		} else {
			// Deselect
			const targetOption = list.querySelector(`[data-annotation="${anno.id}"]`);
			if (targetOption) {
				targetOption.classList.remove('selected');
			}

			// Reset to default text if nothing selected
			if (this.selected.size === 0 && selectedText) {
				selectedText.textContent = "Select an annotation";
			}

			this.selected.delete(anno.id);
		}

		this.emit('selected', anno);
	}

}

addSignals(LayerAnnotation, 'selected', 'loaded');
export { LayerAnnotation }