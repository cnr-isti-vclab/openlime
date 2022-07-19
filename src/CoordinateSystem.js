import { BoundingBox } from './BoundingBox.js';
import { Transform } from './Transform.js'

/**
 * Contain functions to pass between different coordinate system.
 * Here described the coordinate system in sequence
 * - CanvasHTML: Html coordinates: 0,0 Top,Left to width height at bottom right (y Down)
 * - CanvasContext: Same as Html, but scaled by devicePixelRatio (y Down) (required for WebGL, not for SVG)
 * - Viewport: 0,0 bottom,left to (width,height) at top right (y Up)
 * - Center: 0,0 at viewport center (y Up)
 * - Scene: 0,0 at dataset center (y Up). The dataset is placed here through the camera transform 
 * - Layer: 0,0 at Layer center (y Up). Layer is placed over the dataset by the layer transform
 * - Image: 0,0 at bottom,left (y Up)
 * - Layout: 0,0 at top,left (y Down). Depends on layout
 */
class CoordinateSystem {
    
    /**
     * Transform point from Viewport to CanvasHTML
     * @param {*} p point in Viewport: 0,0 at bottom,left
     * @param {Camera} camera Camera which contains viewport information
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns  point in CanvasHtml: 0,0 top,left
     */
     static fromViewportToCanvasHtml(p, camera, useGL) {
        const viewport = this.getViewport(camera, useGL);
        let result = this.invertY(p, viewport);
        return useGL ? this.scale(result, 1/window.devicePixelRatio) : result;
    }

    /**
     * Transform point from CanvasHTML to GLViewport
     * @param {*} p point in CanvasHtml: 0,0 top,left y Down
     * @param {Camera} camera Camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns  point in GLViewport: 0,0 bottom,left, scaled by devicePixelRatio
     */
     static fromCanvasHtmlToViewport(p, camera, useGL) {
        let result = useGL ? this.scale(p, window.devicePixelRatio) : p;
        const viewport = this.getViewport(camera, useGL);
        return this.invertY(result, viewport);
    }

    
    /**
     * Transform a point from Viewport to Layer coordinates
     * @param {*} p point {x,y} in Viewport (0,0 bottom,left, y Up)
     * @param {Camera} camera camera
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns point in Layer coordinates (0, 0 at layer center, y Up)
     */
     static fromViewportToLayer(p, camera, layerT, useGL) {
       // M = InvLayerT * InvCameraT  * Tr(-Vw/2, -Vh/2)
       const cameraT = this.getCurrentTransform(camera, useGL);
       const invCameraT = cameraT.inverse();
       const invLayerT = layerT.inverse();
       const v2c = this.getFromViewportToCenterTransform(camera, useGL);
       const M = v2c.compose(invCameraT.compose(invLayerT)); // First apply v2c, then invCamera, then invLayer
        
       return M.apply(p.x, p.y);
    }

    /**
     * Transform a point from Layer to Viewport coordinates
     * @param {*} p point {x,y} Layer (0,0 at Layer center y Up)
     * @param {Camera} camera 
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns point in viewport coordinates (0,0 at bottom,left y Up)
     */
     static fromLayerToViewport(p, camera, layerT, useGL) {
        const M = this.getFromLayerToViewportTransform(camera, layerT, useGL);
        return M.apply(p.x, p.y);
     }

    /**
     * Transform a point from Layer to Center 
     * @param {*} p point {x,y} in Layer coordinates (0,0 at Layer center)
     * @param {Camera} camera camera
     * @param {Transform} layerT layer transform
     * @returns point in Center (0, 0 at glViewport center) coordinates.
     */
     static fromLayerToCenter(p, camera, layerT, useGL) {
        // M = cameraT * layerT
        const cameraT = this.getCurrentTransform(camera, useGL);
        const M = layerT.compose(cameraT);

        return  M.apply(p.x, p.y);
    }

    ////////////// CHECKED UP TO HERE ////////////////////

    /**
     * Transform a point from Layer to Image coordinates
     * @param {*} p point {x, y} Layer coordinates (0,0 at Layer center)
     * @param {*} layerSize {w, h} Size in pixel of the Layer
     * @returns  Point in Image coordinates (0,0 at bottom,left)
     */
     static fromLayerToImage(p, layerSize) {
        // Tr(Lw/2, Lh/2)
        return {x: p.x + layerSize.w/2, y: p.y + layerSize.h/2};
    }
    
    /**
     * Transform a point from CanvasHtml to Scene
     * @param {*} p point {x, y} in CanvasHtml (0,0 top,left, y Down)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Point in Scene coordinates (0,0 at scene center, y Up)
     */
     static fromCanvasHtmlToScene(p, camera, useGL) {
        // invCameraT * Tr(-Vw/2, -Vh/2) * InvertY  * [Scale(devPixRatio)]
        let result = this.fromCanvasHtmlToViewport(p, camera, useGL);
        const v2c = this.getFromViewportToCenterTransform(camera, useGL);
        const invCameraT = this.getCurrentTransform(camera, useGL).inverse();
        const M = v2c.compose(invCameraT);

        return  M.apply(result.x, result.y);
    }

    /**
     * Transform a point from Scene to CanvasHtml
     * @param {*} p point {x, y} Scene coordinates (0,0 at scene center, y Up)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Point in CanvasHtml (0,0 top,left, y Down)
     */
    static fromSceneToCanvasHtml(p, camera, useGL) {
        // invCameraT * Tr(-Vw/2, -Vh/2) * InvertY  * [Scale(devPixRatio)]
        const v2c = this.getFromViewportToCenterTransform(camera, useGL);
        const c2v = v2c.inverse();
        const CameraT = this.getCurrentTransform(camera, useGL);
        const M = CameraT.compose(c2v);
        let result = M.apply(p.x, p.y);

        return this.fromViewportToCanvasHtml(result, camera, useGL);
    }
    
    /**
     * Transform a point from CanvasHtml to Image
     * @param {*} p  point {x, y} in CanvasHtml (0,0 top,left, y Down)
     * @param {Camera} camera camera 
     * @param {Transform} layerT layer transform 
     * @param {*} layerSize  {w, h} Size in pixel of the Layer
     * @param {bool} applyGLScale if true apply devPixelRatio scale. Keep it false when working with SVG
     * @returns point {x, y} in Image space (0,0 bottom,left of the image, y Up)
     */
     static fromCanvasHtmlToImage(p, camera, layerT, layerSize, useGL) {
        // Translate(Lw/2, Lh/2) * InvLayerT * InvCameraT *  Translate(-Vw/2, -Vh/2) * invertY * [Scale(devicePixelRatio)]
        // in other words... fromLayerToImage * invLayerT * fromCanvasHtmlToScene
        let result = this.fromCanvasHtmlToScene(p, camera, useGL);
        const invLayerT = layerT.inverse();
        result = invLayerT.apply(result.x, result.y);
        result = this.fromLayerToImage(result, layerSize);
        
        return result;
    }

    /**
     * Transform a box from Layer to Scene 
     * @param {BoundingBox} box  box in Layer coordinates (0,0 at layer center)
     * @param {Transform} layerT layer transform
     * @returns box in Scene coordinates (0,0 at scene center)
     */
     static fromLayerBoxToSceneBox(box, layerT) {
         return layerT.transformBox(box); 
    }
  
    /**
     * Transform a box from Layer to Scene 
     * @param {BoundingBox} box  box in Layer coordinates (0,0 at layer center)
     * @param {Transform} layerT layer transform
     * @returns box in Scene coordinates (0,0 at scene center)
     */
     static fromSceneBoxToLayerBox(box, layerT) {
        return layerT.inverse().transformBox(box); 
   }

    /**
     * Transform a box from Layer to Viewport coordinates
     * @param {BoundingBox} box box in Layer coordinates (0,0 at Layer center y Up)
     * @param {Camera} camera 
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Box in Viewport coordinates (0,0 at bottom,left y Up)
     */
     static fromLayerBoxToViewportBox(box, camera, layerT, useGL) {
        const M = this.getFromLayerToViewportTransform(camera, layerT, useGL);
        return M.transformBox(box);  
    }

    /**
     * Transform a box from Layer to Viewport coordinates
     * @param {BoundingBox} box box in Layer coordinates (0,0 at Layer center y Up)
     * @param {Camera} camera 
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Box in Viewport coordinates (0,0 at bottom,left y Up)
     */
     static fromViewportBoxToLayerBox(box, camera, layerT, useGL) {
        const M = this.getFromLayerToViewportTransform(camera, layerT, useGL).inverse();
        return M.transformBox(box);  
    }

    /**
     * Get a transform to go from viewport 0,0 at bottom,left y Up, to Center 0,0 at viewport center
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns transform from Viewport to Center
     */
    static getFromViewportToCenterTransform(camera, useGL) {
        const viewport = this.getViewport(camera, useGL);
        return new Transform({x:viewport.x-viewport.w/2, y:viewport.y-viewport.h/2, z:1, a:0, t:0});
    }

    /**
     * Get a transform to go from Layer (0,0 at Layer center y Up) to Viewport (0,0 at bottom,left y Up)
     * @param {Camera} camera 
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns transform from Layer to Viewport
     */
     static getFromLayerToViewportTransform(camera, layerT, useGL) {
        // M =  Center2Viewport * CameraT  * LayerT
        const cameraT = this.getCurrentTransform(camera, useGL);
        const c2v = this.getFromViewportToCenterTransform(camera, useGL).inverse();
        const M = layerT.compose(cameraT.compose(c2v));
        return M;
    }

    /**
     * Scale x applying f scale factor
     * @param {*} p Point to be scaled
     * @param {Number} f Scale factor
     * @returns Point in CanvasContext (Scaled by devicePixelRation)
     */
    static scale(p, f) {
        return { x:p.x * f, y:p.y * f};
    }

    /**
     * Invert y with respect to viewport.h
     * @param {*} p Point to be transformed 
     * @param {*} viewport current viewport
     * @returns Point with y inverted with respect to viewport.h
     */
    static invertY(p, viewport) {
        return {x:p.x, y:viewport.h - p.y};
    }

    /**
     * Return the camera viewport: scaled by devicePixelRatio if useGL is true.
     * @param {bool} useGL True to work with WebGL, false for SVG. When true viewport scaled by devPixelRatio 
     * @returns Viewport 
     */
    static getViewport(camera, useGL) {
        return useGL ? camera.glViewport() : camera.viewport;
    }

    static getCurrentTransform(camera, useGL) {
        let cameraT = useGL ?
                        camera.getGlCurrentTransform(performance.now()) :
                        camera.getCurrentTransform(performance.now());
       
        return cameraT;
    }
}

export { CoordinateSystem }