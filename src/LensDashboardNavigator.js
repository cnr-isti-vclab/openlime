import { LensDashboard } from "./LensDashboard";

class LensDashboardNavigator extends LensDashboard {
	/**
 	* Manages creation and update of a lens dashboard.
 	* An object literal with Layer `options` can be specified.
	* This class instatiates an optional element of {@link LayerLens}
 	* @param {Object} options An object literal with Lensdashboard parameters.
 	* @param {number} options.borderWidth=30 The extra border thickness (in pixels) around the square including the lens.
 	*/
	constructor(viewer, options) {
        super(viewer, options);
        options = Object.assign({
			toolboxHeight: 25,
            leftButtonTask: null,
            playButtonTask: null,
            rightButtonTask: null
		}, options);
		Object.assign(this, options);
 
        
        this.moving = false;
        this.pos = [0, 0];
        this.delay = 200;
        this.timeout = null; // Timeout for moving

        this.container.style.flexDirection = "column-reverse";
        this.container.style.alignItems = "center";

        this.toolbox = document.createElement('div');
        this.toolbox.style = `display: flex; padding: 4px; justify-content: center; height: ${this.toolboxHeight}px;
        background-color: rgb(80, 80, 80, 0.7); border-radius: 10px; gap: 20px`;
		this.toolbox.classList.add('openlime-lens-dashboard-toolbox');		
		this.container.appendChild(this.toolbox);

        // TOOLBOX ITEMS
        this.leftButton = LensDashboardNavigator.svgFromString('<?xml version="1.0" encoding="utf-8"?><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 120.64 122.88" style="enable-background:new 0 0 120.64 122.88" xml:space="preserve"><g><path d="M66.6,108.91c1.55,1.63,2.31,3.74,2.28,5.85c-0.03,2.11-0.84,4.2-2.44,5.79l-0.12,0.12c-1.58,1.5-3.6,2.23-5.61,2.2 c-2.01-0.03-4.02-0.82-5.55-2.37C37.5,102.85,20.03,84.9,2.48,67.11c-0.07-0.05-0.13-0.1-0.19-0.16C0.73,65.32-0.03,63.19,0,61.08 c0.03-2.11,0.85-4.21,2.45-5.8l0.27-0.26C20.21,37.47,37.65,19.87,55.17,2.36C56.71,0.82,58.7,0.03,60.71,0 c2.01-0.03,4.03,0.7,5.61,2.21l0.15,0.15c1.57,1.58,2.38,3.66,2.41,5.76c0.03,2.1-0.73,4.22-2.28,5.85L19.38,61.23L66.6,108.91 L66.6,108.91z M118.37,106.91c1.54,1.62,2.29,3.73,2.26,5.83c-0.03,2.11-0.84,4.2-2.44,5.79l-0.12,0.12 c-1.57,1.5-3.6,2.23-5.61,2.21c-2.01-0.03-4.02-0.82-5.55-2.37C89.63,101.2,71.76,84.2,54.24,67.12c-0.07-0.05-0.14-0.11-0.21-0.17 c-1.55-1.63-2.31-3.76-2.28-5.87c0.03-2.11,0.85-4.21,2.45-5.8C71.7,38.33,89.27,21.44,106.8,4.51l0.12-0.13 c1.53-1.54,3.53-2.32,5.54-2.35c2.01-0.03,4.03,0.7,5.61,2.21l0.15,0.15c1.57,1.58,2.38,3.66,2.41,5.76 c0.03,2.1-0.73,4.22-2.28,5.85L71.17,61.23L118.37,106.91L118.37,106.91z"/></g></svg>');
        this.leftButton.style = `height: 100%; margin: 0 5px; pointer-events: auto; cursor: pointer`;
        this.leftButton.classList.add('openlime-lens-dashboard-button');
        this.appendToolbox(this.leftButton, this.leftCb);

        this.playButton = LensDashboardNavigator.svgFromString(`<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" 
        image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 336 511.46">
        <path class="pb-play" fill-rule="nonzero" d="M0 469V42.42c.02-9.89 3.46-19.81 10.45-27.85 15.39-17.66 42.2-19.53 59.86-4.15L321.46 229.2c1.69 1.51 3.32 3.17 4.81 4.97 14.92 18.04 12.4 44.78-5.64 59.7L71.14 500.3c-7.56 6.93-17.62 11.16-28.68 11.16C19.02 511.46 0 492.44 0 469z"/>
        <path class="pb-pause" d="M -0.12778469,1.48305 H 137.14373 V 518.30226 H -0.12778469 Z m 201.54270469,0 H 338.68643 V 518.30226 H 201.41492 Z"/></svg>`);
        this.playButton.style = `height: 100%; margin: 0 5px; pointer-events: auto; cursor: pointer`;
        this.playButton.classList.add('openlime-lens-dashboard-button');
        this.appendToolbox(this.playButton, this.playCb);
        this.playButtonActive = false;

        this.rightButton = LensDashboardNavigator.svgFromString('<?xml version="1.0" encoding="utf-8"?><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 120.64 122.88" style="enable-background:new 0 0 120.64 122.88" xml:space="preserve"><g><path d="M54.03,108.91c-1.55,1.63-2.31,3.74-2.28,5.85c0.03,2.11,0.84,4.2,2.44,5.79l0.12,0.12c1.58,1.5,3.6,2.23,5.61,2.2 c2.01-0.03,4.01-0.82,5.55-2.37c17.66-17.66,35.13-35.61,52.68-53.4c0.07-0.05,0.13-0.1,0.19-0.16c1.55-1.63,2.31-3.76,2.28-5.87 c-0.03-2.11-0.85-4.21-2.45-5.8l-0.27-0.26C100.43,37.47,82.98,19.87,65.46,2.36C63.93,0.82,61.93,0.03,59.92,0 c-2.01-0.03-4.03,0.7-5.61,2.21l-0.15,0.15c-1.57,1.58-2.38,3.66-2.41,5.76c-0.03,2.1,0.73,4.22,2.28,5.85l47.22,47.27 L54.03,108.91L54.03,108.91z M2.26,106.91c-1.54,1.62-2.29,3.73-2.26,5.83c0.03,2.11,0.84,4.2,2.44,5.79l0.12,0.12 c1.57,1.5,3.6,2.23,5.61,2.21c2.01-0.03,4.02-0.82,5.55-2.37C31.01,101.2,48.87,84.2,66.39,67.12c0.07-0.05,0.14-0.11,0.21-0.17 c1.55-1.63,2.31-3.76,2.28-5.87c-0.03-2.11-0.85-4.21-2.45-5.8C48.94,38.33,31.36,21.44,13.83,4.51l-0.12-0.13 c-1.53-1.54-3.53-2.32-5.54-2.35C6.16,2,4.14,2.73,2.56,4.23L2.41,4.38C0.84,5.96,0.03,8.05,0,10.14c-0.03,2.1,0.73,4.22,2.28,5.85 l47.18,45.24L2.26,106.91L2.26,106.91z"/></g></svg>');
        this.rightButton.style = `height: 100%; margin: 0 5px; pointer-events: auto; cursor: pointer`;
        this.rightButton.classList.add('openlime-lens-dashboard-button');
        this.appendToolbox(this.rightButton, this.rightCb);

    }

    leftCb = (e) => {
        if(this.leftButtonTask) this.leftButtonTask(e);
    }

    playCb = (e) => {
        this.playButtonActive = !this.playButtonActive;
        this.playButton.classList.toggle('active'); // If active then show 'pause'
        if(this.playButtonTask) this.playButtonTask(e, this.playButtonActive);
    }

    rightCb = (e) => {
        if(this.rightButtonTask) this.rightButtonTask(e);
    }

    hide() {
        this.container.classList.toggle('closed');
    }

    show() {
        this.container.classList.toggle('closed');
    }

    appendToolbox(elm, task) {
        this.toolbox.appendChild(elm);
        elm.addEventListener('click', (e) => task(e));
    }

	/** @ignore */
    update(x, y, r) {
		const now = performance.now();
		let cameraT = this.viewer.camera.getCurrentTransform(now);
		const p = this.viewer.camera.sceneToCanvas(x, y, cameraT);
		const size = r * cameraT.z;
		const sizew = 2 * size;
        const sizeh = 2 * size + this.borderWidth;
		p.x -= size;
		p.y += size;
		p.y = this.viewer.camera.viewport.h - p.y;
		this.container.style.left = `${p.x}px`;
		this.container.style.top = `${p.y}px`;
		this.container.style.width = `${sizew}px`;
		this.container.style.height = `${sizeh}px`;
        if( x == this.pos[0] && y == this.pos[1]) return;
        if(!this.moving) {
            this.hide();
            this.moving = true;
        }
        if(this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout( () => {
            this.show();
            this.moving = false;
        },
        this.delay
        );
	}
}

export {LensDashboardNavigator}
