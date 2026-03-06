import { BoundingBox } from './BoundingBox.js';
import { Transform } from './Transform.js'

// FIXME TODO REMOVE ALL USEGL PARAMETERS, SCALE AND DEVICEPIXELRATIO 

/**
 * Contain functions to pass between different coordinate system.
 * Here described the coordinate system in sequence
 * - CanvasHTML: Html coordinates: 0,0 left,top to width height at bottom right (y Down)
 * - Viewport: 0,0 left,bottom to (width,height) at top right (y Up)
 * - Center: 0,0 at viewport center (y Up)
 * - Scene: 0,0 at dataset center (y Up). The dataset is placed here through the camera transform 
 * - Layer: 0,0 at Layer center (y Up). Layer is placed over the dataset by the layer transform
 * - Image: 0,0 at left,top (y Down)
 * - Layout: 0,0 at left,top (y Down). Depends on layout
 */
class CoordinateSystem {

    /**
     * Transform point from Viewport to CanvasHTML
     * @param {*} p point in Viewport: 0,0 at left,bottom
     * @param {Camera} camera Camera which contains viewport information
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns {{x: number, y: number}} point in CanvasHtml: 0,0 left,top
     */
    static fromViewportToCanvasHtml(p, camera, useGL) {
        const viewport = this.getViewport(camera, useGL);
        let result = {x:p.x + viewport.x, y: p.y + viewport.y};
        result = this.invertY(result, viewport);
        return result;
    }

    /**
     * Transform point from CanvasHTML to GLViewport
     * @param {*} p point in CanvasHtml: 0,0 left,top y Down
     * @param {Camera} camera Camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns {{x: number, y: number}} point in GLViewport: 0,0 left,bottom
     */
    static fromCanvasHtmlToViewport(p, camera, useGL) {
        let result = p;
        const viewport = this.getViewport(camera, useGL);
        result = this.invertY(result, viewport);
        result.x -= viewport.x;
        result.y -= viewport.y;
        return result;
    }


    /**
     * Transform a point from Viewport to Layer coordinates
     * @param {*} p point {x,y} in Viewport (0,0 left,bottom, y Up)
     * @param {Camera} camera camera
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns {{x: number, y: number}} point in Layer coordinates (0, 0 at layer center, y Up)
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
     * @returns {{x: number, y: number}} point in viewport coordinates (0,0 at left,bottom y Up)
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
     * @returns {{x: number, y: number}} point in Center (0, 0 at glViewport center) coordinates.
     */
    static fromLayerToCenter(p, camera, layerT, useGL) {
        // M = cameraT * layerT
        const cameraT = this.getCurrentTransform(camera, useGL);
        const M = layerT.compose(cameraT);

        return M.apply(p.x, p.y);
    }

    ////////////// CHECKED UP TO HERE ////////////////////

    /**
     * Transform a point from Layer to Image coordinates
     * @param {*} p point {x, y} Layer coordinates (0,0 at Layer center)
     * @param {*} layerSize {w, h} Size in pixel of the Layer
     * @returns {{x: number, y: number}} Point in Image coordinates (0,0 at left,top, y Down)
     */
    static fromLayerToImage(p, layerSize) {
        // InvertY * Tr(Lw/2, Lh/2)
        let result = { x: p.x + layerSize.w / 2, y: p.y + layerSize.h / 2 };
        return this.invertY(result, layerSize);
    }

    /**
     * Transform a point from CanvasHtml to Scene
     * @param {*} p point {x, y} in CanvasHtml (0,0 left,top, y Down)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns {{x: number, y: number}} Point in Scene coordinates (0,0 at scene center, y Up)
     */
    static fromCanvasHtmlToScene(p, camera, useGL) {
        // invCameraT * Tr(-Vw/2, -Vh/2) * InvertY  * [Scale(devPixRatio)]
        let result = this.fromCanvasHtmlToViewport(p, camera, useGL);
        const v2c = this.getFromViewportToCenterTransform(camera, useGL);
        const invCameraT = this.getCurrentTransform(camera, useGL).inverse();
        const M = v2c.compose(invCameraT);

        return M.apply(result.x, result.y);
    }

    /**
     * Transform a point from Scene to CanvasHtml
     * @param {*} p point {x, y} Scene coordinates (0,0 at scene center, y Up)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns {{x: number, y: number}} Point in CanvasHtml (0,0 left,top, y Down)
     */
    static fromSceneToCanvasHtml(p, camera, useGL) {
        // invCameraT * Tr(-Vw/2, -Vh/2) * InvertY  * [Scale(devPixRatio)]
        let result = this.fromSceneToViewport(p, camera, useGL)
        return this.fromViewportToCanvasHtml(result, camera, useGL);
    }

    /**
     * Transform a point from Scene to Viewport
     * @param {*} p point {x, y} Scene coordinates (0,0 at scene center, y Up)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns {{x: number, y: number}} Point in Viewport (0,0 left,bottom, y Up)
     */
    static fromSceneToViewport(p, camera, useGL) {
        // FromCenterToViewport * CamT
        const c2v = this.getFromViewportToCenterTransform(camera, useGL).inverse();
        const CameraT = this.getCurrentTransform(camera, useGL);
        const M = CameraT.compose(c2v);

        return M.apply(p.x, p.y);
    }

    /**
     * Transform a point from Scene to Viewport, using given transform and viewport
     * @param {*} p point {x, y} Scene coordinates (0,0 at scene center, y Up)
     * @param {Transform} cameraT camera transform
     * @param {*} viewport viewport {x,y,dx,dy,w,h}
     * @returns {{x: number, y: number}} Point in Viewport (0,0 left,bottom, y Up)
     */
    static fromSceneToViewportNoCamera(p, cameraT, viewport) {
        // invCameraT * Tr(-Vw/2, -Vh/2) * InvertY  * [Scale(devPixRatio)]
        const c2v = this.getFromViewportToCenterTransformNoCamera(viewport).inverse();
        const M = cameraT.compose(c2v);

        return M.apply(p.x, p.y);
    }

    /**
     * Transform a point from Viewport to Scene.
     * @param {*} p point {x, y} Viewport coordinates (0,0 at left,bottom, y Up)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns {{x: number, y: number}} Point in Viewport (0,0 at scene center, y Up)
     */
    static fromViewportToScene(p, camera, useGL) {
        // invCamT * FromViewportToCenter 
        const v2c = this.getFromViewportToCenterTransform(camera, useGL);
        const invCameraT = this.getCurrentTransform(camera, useGL).inverse();
        const M = v2c.compose(invCameraT);

        return M.apply(p.x, p.y);
    }

    /**
     * Transform a point from Viewport to Scene, using given transform and viewport
     * @param {*} p point {x, y} Viewport coordinates (0,0 at left,bottom, y Up)
     * @param {Transform} cameraT camera transform
     * @param {*} viewport viewport {x,y,dx,dy,w,h}
     * @returns {{x: number, y: number}} Point in Viewport (0,0 at scene center, y Up)
     */
    static fromViewportToSceneNoCamera(p, cameraT, viewport) {
        // invCamT * FromViewportToCenter 
        const v2c = this.getFromViewportToCenterTransformNoCamera(viewport);
        const invCameraT = cameraT.inverse();
        const M = v2c.compose(invCameraT);

        return M.apply(p.x, p.y);
    }

    /**
     * Transform a point from CanvasHtml to Image
     * @param {*} p  point {x, y} in CanvasHtml (0,0 left,top, y Down)
     * @param {Camera} camera camera 
     * @param {Transform} layerT layer transform 
     * @param {*} layerSize  {w, h} Size in pixel of the Layer
     * @param {bool} useGL if true apply devPixelRatio scale. Keep it false when working with SVG
     * @returns {{x: number, y: number}} Point in Image space (0,0 left,top of the image, y Down)
     */
    static fromCanvasHtmlToImage(p, camera, layerT, layerSize, useGL) {
        // Translate(Lw/2, Lh/2) * InvLayerT * InvCameraT *  Translate(-Vw/2, -Vh/2) * invertY
        // in other words... fromLayerToImage * invLayerT * fromCanvasHtmlToScene
        let result = this.fromCanvasHtmlToScene(p, camera, useGL);
        const invLayerT = layerT.inverse();
        result = invLayerT.apply(result.x, result.y);
        result = this.fromLayerToImage(result, layerSize);

        return result;
    }

    /**
     * Transform a box from Viewport to Image coordinates
     * @param {BoundingBox} box in Viewport coordinates (0,0 at left,bottom, y Up)
     * @param {Transform} cameraT camera Transform
     * @param {*} viewport {x,y,dx,dy,w,h}
     * @param {Transform} layerT layer transform
     * @param {*} layerSize {w,h} layer pixel size
     * @returns {BoundingBox} box in Image coordinates (0,0 left,top, y Down)
     */
    static fromViewportBoxToImageBox(box, cameraT, viewport, layerT, layerSize) {
        // InvertYonImage * T(Lw/2, Lh/2) * InvL * InvCam * T(-Vw/2,-Vh/2) 
        let V2C = new Transform({ x: -viewport.w / 2, y: -viewport.h / 2 });
        let C2S = cameraT.inverse();
        let S2L = layerT.inverse();
        let L2I = new Transform({ x: layerSize.w / 2, y: layerSize.h / 2 });
        let M = V2C.compose(C2S.compose(S2L.compose(L2I)));
        let resultBox = new BoundingBox();
        for (let i = 0; i < 4; ++i) {
            let p = box.corner(i);
            p = M.apply(p.x, p.y);
            p = CoordinateSystem.invertY(p, layerSize);
            resultBox.mergePoint(p);
        }
        return resultBox;
    }

    /**
     * Transform a box from Layer to Scene 
     * @param {BoundingBox} box  box in Layer coordinates (0,0 at layer center)
     * @param {Transform} layerT layer transform
     * @returns {BoundingBox} box in Scene coordinates (0,0 at scene center)
     */
    static fromLayerBoxToSceneBox(box, layerT) {
        return layerT.transformBox(box);
    }

    /**
     * Transform a box from Scene to Layer 
     * @param {BoundingBox} box  box in Layer coordinates (0,0 at layer center)
     * @param {Transform} layerT layer transform
     * @returns {BoundingBox} box in Layer coordinates (0,0 at layer center)
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
     * @returns {BoundingBox} Box in Viewport coordinates (0,0 at left, bottom y Up)
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
     * @returns {BoundingBox} Box in Layer coordinates (0,0 at layer center y Up)
     */
    static fromViewportBoxToLayerBox(box, camera, layerT, useGL) {
        const M = this.getFromLayerToViewportTransform(camera, layerT, useGL).inverse();
        return M.transformBox(box);
    }

    /**
     * Get a transform to go from viewport 0,0 at left, bottom y Up, to Center 0,0 at viewport center
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns {Transform} transform from Viewport to Center
     */
    static getFromViewportToCenterTransform(camera, useGL) {
        const viewport = this.getViewport(camera, useGL);
        return this.getFromViewportToCenterTransformNoCamera(viewport);
    }

    /**
     * Get a transform to go from viewport 0,0 at left, bottom y Up, to Center 0,0 at viewport center
     * from explicit viewport param. (Not using camera parameter here)
     * @param {*} viewport viewport
     * @returns {Transform} transform from Viewport to Center
     */
    static getFromViewportToCenterTransformNoCamera(viewport) {
        return new Transform({x:-viewport.w/2, y:-viewport.h/2, z:1, a:0, t:0});
    }

    /**
     * Return transform with y reflected wrt origin (y=-y)
     * @param {Transform} t  
     * @returns {Transform} transform, with y reflected (around 0)
     */
    static reflectY(t) {
        return new Transform({ x: t.x, y: -t.y, z: t.z, a: t.a, t: t.t });
    }

    /**
     * Get a transform to go from Layer (0,0 at Layer center y Up) to Viewport (0,0 at left,bottom y Up)
     * @param {Camera} camera 
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns {Transform} transform from Layer to Viewport
     */
    static getFromLayerToViewportTransform(camera, layerT, useGL) {
        // M =  Center2Viewport * CameraT  * LayerT
        const cameraT = this.getCurrentTransform(camera, useGL);
        const c2v = this.getFromViewportToCenterTransform(camera, useGL).inverse();
        const M = layerT.compose(cameraT.compose(c2v));
        return M;
    }

    /**
     * Get a transform to go from Layer (0,0 at Layer center y Up) to Viewport (0,0 at left,bottom y Up)
     * @param {Transform} CameraT camera transform
     * @param {viewport} viewport {x,y,dx,dy,w,h} viewport
     * @param {Transform} layerT layer transform
     * @returns {Transform} transform from Layer to Viewport
     */
    static getFromLayerToViewportTransformNoCamera(cameraT, viewport, layerT) {
        // M =  Center2Viewport * CameraT  * LayerT
        const c2v = this.getFromViewportToCenterTransformNoCamera(viewport).inverse();
        const M = layerT.compose(cameraT.compose(c2v));
        return M;
    }


    /**
     * Scale x applying f scale factor
     * @param {*} p Point to be scaled
     * @param {Number} f Scale factor
     * @returns {{x: number, y: number}} Point scaled
     */
    static scale(p, f) {
        return { x: p.x * f, y: p.y * f };
    }

    /**
     * Invert y with respect to viewport.h
     * @param {*} p Point to be transformed 
     * @param {*} viewport current viewport
     * @returns {{x: number, y: number}} Point with y inverted with respect to viewport.h
     */
    static invertY(p, viewport) {
        return { x: p.x, y: viewport.h - p.y };
    }

    /**
     * Return the camera viewport: scaled by devicePixelRatio if useGL is true.
     * @param {bool} useGL True to work with WebGL, false for SVG. When true viewport scaled by devPixelRatio 
     * @returns {{x: number, y: number, dx: number, dy: number, w: number, h: number}} Viewport 
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