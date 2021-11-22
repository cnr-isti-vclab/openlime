import {Controller} from './Controller.js'
import { Layer  } from './Layer.js'
import {Lens} from './Lens.js'


class ControllerLensTilt extends Controller {
	constructor(options) {

		super(options);
        if (!options.lensLayer) {
            console.log("ControllerLensTilt lensLayer option required");
            throw "ControllerLens lensLayer option required";
        }
 
        if (!options.camera) {
            console.log("ControllerLensTilt camera option required");
            throw "ControllerLens camera option required";
        }
		
		this.zoomAmount = 1.2;          //for wheel or double tap event

        this.maxDatasetSize = 1000; // Update when camera.boundingBox is set
        this.minDatasetSize = 1000;
        this.springK = 500; 

        let callback = () => {
            const discardHidden = true;
            const bbox = this.camera.boundingBox;
            this.maxDatasetSize = Math.max(bbox.width(), bbox.height());
            this.minDatasetSize = Math.min(bbox.width(), bbox.height());
            this.springK = 500;//this.minDatasetSize/4;
            console.log("Box w: " + this.minDatasetSize + ", h " + this.maxDatasetSize);
            console.log(options.camera);
		};
        this.limeCanvas.addEvent('updateSize', callback);
	
        // Spring stuff
        this.mass = 1;
        this.updateTimeInterval = 10;
        this.zoomDelay = 10;

        console.log("ControllerLensTilt constructor");
        this.reset();
    }

    reset() {
		this.panning = false;           //true if in the middle of a pan
		this.zooming = false;           //true if in the middle of a pinch

        this.cameraInitialHeight = this.maxDatasetSize / 2;
        this.cameraPosition = [0, 0, this.cameraInitialHeight]; 
        this.targetPosition = [0, 0, 0];
        this.lensPosition   = [0, 0];

        this.cameraVelocity = [0, 0];  
        this.targetVelocity = [0, 0];
        this.lensVelocity   = [0, 0];

		this.clickPos = [0, 0];
		this.cursorPos  = [0, 0];
        this.deltaCursorLens = [0, 0];
        this.clickInsideLens = false;

        const canvas = this.limeCanvas.gl.canvas;
        this.initialRadius = Math.max(canvas.clientWidth, canvas.clientHeight) / 8;
 
        this.lensLayer.setRadius(this.initialRadius, 0);
        this.lensRadius = this.initialRadius;

        this.startTime = performance.now();
        this.releaseTime =  performance.now();
        this.lastTick = performance.now();

        console.log("RESET");
    }

	panStart(e) {
		if(!this.active || this.panning || !this.activeModifiers.includes(this.modifierState(e)))
			return;
        
        this.zooming = false;
        this.updateCameraPosition();
        const p = this.getPixelPosition(e); 
        const m = this.camera.getCurrentTransform(performance.now());
        
        this.clickInsideLens = this.isInsideLens(p);
        if (!this.clickInsideLens) {
            return;
        }
        
		this.panning = true;
		this.clickPos = [p[0], p[1]];

        this.lensVelocity = [0, 0];
        let lensScreenP =  this.getScreenPosition(this.lensPosition);
        this.deltaCursorLens =  [lensScreenP[0] - this.clickPos[0], lensScreenP[1] - this.clickPos[1]];

		let now = performance.now();
        this.startTime = now;

		e.preventDefault();
	}

	panMove(e) {
		if (!this.panning)
			return;

        const p =  this.getPixelPosition(e); 
        this.cursorPos = [p[0], p[1]];
	}

	panEnd(e) {
		this.panning = false;
        this.releaseTime = performance.now();
	}

	mouseWheel(e) {
        this.panning = false;
        this.zooming = true;
        this.updateCameraPosition();

		let delta = e.deltaY > 0 ? 1 : -1;
		const dz = Math.pow(this.zoomAmount, delta);
        const p =  this.getPixelPosition(e); 
        this.clickInsideLens = this.isInsideLens(p);

        if (this.clickInsideLens) {
            this.lensRadius *= dz;
            this.lensLayer.setRadius(this.lensRadius);
        } else {
            const pos = this.camera.mapToScene(e.offsetX, e.offsetY, this.camera.getCurrentTransform(performance.now()));
            this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
        }
		e.preventDefault();
	}

    criticalDamping(k, m) {
        return 2 * Math.sqrt(k * m);
    }
    /* 
    * Outside set a timer which calls this function every updateTimeInterval ms
    * to update the camera/lens indepenently from user input
    */
    updatePosition() {
        const now = performance.now();
        const dt = (now - this.lastTick) * 0.001;
        this.lastTick = now;

        if (!this.clickInsideLens || this.zooming) return;
        
        this.updateCameraPosition();

        const m = this.camera.getCurrentTransform(now);

        // Spring between clicked mouse pos and lens position
        const K = this.getSpringConstants();

        // Mouse-Lens Spring
        let lensScreenP =  this.getScreenPosition(this.lensPosition);
        const lensMouseForce =  [(-K.fix*(lensScreenP[0] - this.cursorPos[0] - this.deltaCursorLens[0])), 
                                 (-K.fix*(lensScreenP[1] - this.cursorPos[1] - this.deltaCursorLens[1]))];
        const maxK = Math.max(K.fix, Math.max(K.camera, K.focusTarget));
        const damping = 1.5 * this.criticalDamping(maxK, this.mass);
        //console.log("MaxK " + maxK.toFixed(0) + " damping " + damping.toFixed(0));
        const lensDampingForce = [damping*this.lensVelocity[0], damping*this.lensVelocity[1]];
        
        // Lens-Camera Spring
        const cameraLensForce = [-K.camera*(this.cameraPosition[0] - this.lensPosition[0]), 
                                 -K.camera*(this.cameraPosition[1] - this.lensPosition[1])];
        const cameraDampingForce = [damping*this.cameraVelocity[0], damping*this.cameraVelocity[1]];
        
        // Tilt: lens-target Spring
        const targetLensForce = [-K.focusTarget*(this.targetPosition[0] - this.lensPosition[0]), 
                                 -K.focusTarget*(this.targetPosition[1] - this.lensPosition[1])];
        const targetCameraForce = [-K.camera*(this.targetPosition[0] - this.cameraPosition[0]), 
                                   -K.camera*(this.targetPosition[1] - this.cameraPosition[1])];
        const targetDampingForce = [damping*this.targetVelocity[0], damping*this.targetVelocity[1]];
        const targetForce = [targetLensForce[0]+targetCameraForce[0]-targetDampingForce[0], 
                             targetLensForce[1]+targetCameraForce[1]-targetDampingForce[1]];

        // Sum Forces
        const lensForce = [lensMouseForce[0]-lensDampingForce[0]-cameraLensForce[0]+cameraDampingForce[0], 
                           lensMouseForce[1]-lensDampingForce[1]-cameraLensForce[1]+cameraDampingForce[1]];
        const cameraForce = [cameraLensForce[0]-cameraDampingForce[0], 
                             cameraLensForce[1]-cameraDampingForce[1]];

        // Compute accelerations
        const lensAcceleration = [lensForce[0]/this.mass, lensForce[1]/this.mass];
        const cameraAcceleration = [cameraForce[0]/this.mass, cameraForce[1]/this.mass];
        const targetAcceleration = [targetForce[0]/this.mass, targetForce[1]/this.mass];

        // Lens velocity and positions
        this.lensVelocity[0] += lensAcceleration[0]*dt;
        this.lensVelocity[1] += lensAcceleration[1]*dt;
        this.lensPosition[0] += this.lensVelocity[0]*dt;
        this.lensPosition[1] += this.lensVelocity[1]*dt;
        
        // Camera velocity and positions
        this.cameraVelocity[0] += cameraAcceleration[0] * dt;
        this.cameraVelocity[1] += cameraAcceleration[1] * dt;
        this.cameraPosition[0] += this.cameraVelocity[0] * dt;
        this.cameraPosition[1] += this.cameraVelocity[1] * dt;
        
        // // target velocity and positions
        this.targetVelocity[0] += targetAcceleration[0]*dt;
        this.targetVelocity[1] += targetAcceleration[1]*dt;
        this.targetPosition[0] += this.targetVelocity[0]*dt;
        this.targetPosition[1] += this.targetVelocity[1]*dt;

        this.clipOnDataset(this.lensPosition, this.lensVelocity);
        this.clipOnDataset(this.cameraPosition, this.cameraVelocity);
        this.clipOnDataset(this.targetPosition, this.targetVelocity);

        const lsp = this.getScreenPosition(this.lensPosition)[0];

        this.camera.setPosition(this.updateTimeInterval, -this.cameraPosition[0]*m.z, this.cameraPosition[1]*m.z, m.z, m.a);
        this.lensLayer.setCenter(this.lensPosition[0], this.lensPosition[1], 0);
    }

    updateCameraPosition() {
        const m = this.camera.getCurrentTransform(performance.now());
        this.cameraPosition[0] = -m.x/m.z;
        this.cameraPosition[1] =  m.y/m.z;
    }

    clipOnDataset(pos, velocity) {
        if (this.camera.boundingBox == null)  {
            console.log("NULLBOX");
            return;
        }
        const bbox = this.camera.boundingBox;
        const datasetBox = [bbox.xLow, bbox.yLow, bbox.xHigh, bbox.yHigh];
        for(let i = 0; i < 2; ++i) {
            if (pos[i] < datasetBox[i]) {
                pos[i] = datasetBox[i];
                velocity[i] = 0;
            }
            if (pos[i] > datasetBox[2+i]) {
                pos[i] = datasetBox[2+i];
                velocity[i] = 0;
            }
        }
    }

    getSpringConstants() {
        const canvas = this.limeCanvas.gl.canvas;
        
        const screenTarget = this.getScreenPosition(this.targetPosition);
        const screenCamera = this.getScreenPosition([this.cameraPosition[0], this.cameraPosition[1]]);
        const delta = [screenCamera[0]-screenTarget[0], screenCamera[1]-screenTarget[1]];
        const screenCameraTargetLen = this.length(delta);

        const lensScreenP = this.getScreenPosition(this.lensPosition);
        const distFromCenter = Math.max(Math.abs(canvas.clientWidth/2-lensScreenP[0]), 
                                        Math.abs(canvas.clientHeight/2-lensScreenP[1]));
        const scale = this.camera.getCurrentTransform(performance.now()).z;
        const lensRadius = this.lensRadius * scale;
        const dim = Math.min(canvas.clientWidth, canvas.clientHeight);
        const minLimit = dim * 0.1 * 0.5;
        const maxLimit = dim * 0.3 * 0.5;
        const v = (distFromCenter + screenCameraTargetLen)*0.5;
        const speedF = this.smoothstep(v, minLimit, maxLimit);
        //const speedF = Math.min(Math.max(0, (v - minLimit) / (maxLimit-minLimit)), 1);
        let focusTargetK = speedF * this.springK;
        let cameraK = (1-speedF) * this.springK;
        // Use fixK | independently from scale obtain same movement on screen 
        let fixK = this.springK * 0.2 /scale;

        // If less than easeTime in ms passed from click, change smoothly the parameters
        const now = performance.now();
        const easeTime = 1000;
        const elapsed = now - this.startTime;
        const easein =  Math.min(1, elapsed/easeTime);
        cameraK *= easein;
        focusTargetK *= easein;

        // Keep the cameraK equal to focusTarget for Local behaviour in order 
        // to apply same force to camera and target to avoid unwated tilts
        cameraK = Math.min(cameraK, focusTargetK);

        // Apply ease-out to smooth transition from dragging to Landing
        if (!this.panning) {
            const elapsed = now - this.releaseTime;
            const easeout = Math.max(0, 1 - elapsed/easeTime);
            const gotoSpringK = this.springK;
            cameraK = easeout * cameraK + (1-easeout) * gotoSpringK;
            fixK = 0;
        }
      
        return {t:speedF, camera:cameraK, focusTarget:focusTargetK, fix: fixK};
    }

    getSpeedDependentHeight() {
        return this.cameraHeight;
        // Do not change the height for small movements when user still want to perform local exploration
        // Start to apply height change when the tilt behaviour become dominant: at t = 0.5.
        // Discontinuity may appear when clicking on landing because of strong t changes
        // const lc = [this.lensPosition[0] - this.cameraPosition[0], this.lensPosition[1] - this.cameraPosition[1]];
        // const maxDist = this.cameraHeight;
        // const K = this.getSpringConstants();
        // let lensCameraLen = this.length(lc) * Math.max(0, K.t-0.5);
        // return Math.min(this.maxDatasetSize*2, this.cameraHeight + lensCameraLen);

        // This code looks to be more resilient to discontinuities at click during Landing,
        // BUT it depends from hardcoded parameter. Do not apply delta height until
        // movement is bigger than 30% of default camera height
        const lc = [this.lensPosition[0] - this.cameraPosition[0], this.lensPosition[1] - this.cameraPosition[1]];
        const lensCameraLen = Math.max(0, this.length(lc) - this.cameraHeight*0.3);
        return Math.min(this.maxDatasetSize*2, this.cameraHeight + lensCameraLen/2);
    }

    length(v) {
        return Math.sqrt(v[0]*v[0] + v[1]*v[1]);
    }

    smoothstep(x, x0, x1) {
        if (x < x0) {
            return 0;
        } else if (x > x1) {
            return 1;
        } else {
            const t = (x - x0) / (x1 - x0);
            return t * t * (-2 * t + 3);
        }
    }
    
    isInsideLens(p) {
        const c = this.getScreenPosition(this.lensPosition);

        const m = this.camera.getCurrentTransform(performance.now());
        const scale = m.z;

        const dx = p[0] - c[0];
        const dy = p[1] - c[1];
        const d2 = dx*dx + dy*dy;
        const r = this.lensRadius * scale;
        const res = d2 < r * r;

        return res;
    }

    getPixelPosition(e) {
        let x = e.offsetX;
        let y = e.offsetY;
        let rect = e.target.getBoundingClientRect();
        return [x, rect.height - y];
    }
    
    getScreenPosition(p) {
        // Transform from p expressed wrt world center (at dataset center is 0,0)
        // to Viewport coords 0,w 0,h
		let now = performance.now();
        const t = this.camera.getCurrentTransform(now);
        const c = t.sceneToViewportCoords(this.camera.viewport, p);
        return c;
    }

    getWorldPositionOnPlane(p) {
        const pWorld = this.getWorldPosition([p[0], p[1], 1]);
        const h = this.getSpeedDependentHeight();
        const rSrc = [this.cameraPosition[0], this.cameraPosition[1], h];
        let rDir = [pWorld[0]-rSrc[0], pWorld[1]-rSrc[1], pWorld[2] - rSrc[2]];
        const len = Math.sqrt(rDir[0]*rDir[0] + rDir[1]*rDir[1] + rDir[2]*rDir[2]);
        if (len == 0) {
            console.log("WWW NULL DISTANCE SHOULD NOT HAPPEN!");
            return pWorld;
        } 
        rDir = [rDir[0]/len, rDir[1]/len, rDir[2]/len] ;
        const t = -rSrc[2]/rDir[2];
        return [rSrc[0] + rDir[0]*t, rSrc[1] + rDir[1]*t, 0];
    }
    
    getWorldPosition(p) {
        // Transform a point from pixels coordinates [0,w,0,h] to world coordinates
        let PVinv = mat4.create();
        mat4.multiply(PVinv, this.projectionMatrix, this.modelViewMatrix);
        mat4.invert(PVinv, PVinv);

        const w = this.limeCanvas.gl.clientWidth;
        const h = this.limeCanvas.gl.clientHeight;
        const pUnit = [2*p[0]/w-1, 2*p[1]/h-1, p[2], 1];
        let pWorld = vec4.create();
        vec4.transformMat4(pWorld, pUnit, PVinv);
        if (pWorld[3] != 0) {
            pWorld[0] /= pWorld[3];
            pWorld[1] /= pWorld[3];
            pWorld[2] /= pWorld[3];
            pWorld[3] = 1;
        }
        return pWorld;
    }
};

export { ControllerLensTilt }