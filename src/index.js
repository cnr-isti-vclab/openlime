import { Viewer } from './Viewer.js'
import { Layer } from './Layer.js'
import { LayoutTiles } from './LayoutTiles.js'
import { LayerImage } from './LayerImage.js'
import { LayerDstretch } from './LayerDstretch.js'
import { LayerCombiner } from './LayerCombiner.js'
import { ShaderCombiner } from './ShaderCombiner.js'
import { ControllerPanZoom } from './ControllerPanZoom.js'
import { UIBasic, UIDialog } from './UIBasic.js'
import { LayerLens } from './LayerLens.js'
import { Skin } from './Skin.js'
import { LayerAnnotation } from './LayerAnnotation.js'
import { LayerSvgAnnotation } from './LayerSvgAnnotation.js'
import { EditorSvgAnnotation } from './EditorSvgAnnotation.js'
import { LayerRTI } from './LayerRTI.js'
import { LayerNeuralRTI } from './LayerNeuralRTI.js'
import { ShaderFilter } from './ShaderFilter.js'
import { AnnotationEditor } from './AnnotationEditor.js'

// CLASS TO CREATE FILTERS

class GammaFilter extends ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = { 
            gamma: {type: 'float', needsUpdate: true, size: 1, value: 2.2},
        };
    }

    fragDataSrc(gl) {
        return `
        vec4 ${this.functionName()}(vec4 col){
            float igamma = 1.0/gamma;
            return vec4(pow(col.r, igamma), pow(col.g, igamma), pow(col.b, igamma), col.a);
        }`;
    }
}

class UnsharpFilter extends ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = { 
            unsharp: {type: 'float', needsUpdate: true, size: 1, value: 10.0},
        };
    }

    fragDataSrc(gl) {
        return `
        vec4 ${this.functionName()}(vec4 col){
            mat3 unsharp_M = mat3(0.0, -1.0, 0.0, -1.0, 5.0, -1.0, 0.0, -1.0, 0.0);

            unsharp_M = mat3(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0) +
                      (mat3(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0) - 
                      mat3(0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0)/5.0)*unsharp;

            // unsharp_M = mat3(0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0)/5.0;

            vec3 blur = unsharp_M[0][0]*render(base,vec2(v_texcoord.x-1.0/tileSize.x,v_texcoord.y-1.0/tileSize.y)).rgb + 
                        unsharp_M[0][1]*render(base,vec2(v_texcoord.x-1.0/tileSize.x,v_texcoord.y)).rgb +
                        unsharp_M[0][2]*render(base,vec2(v_texcoord.x-1.0/tileSize.x,v_texcoord.y+1.0/tileSize.y)).rgb +
                        unsharp_M[1][0]*render(base,vec2(v_texcoord.x,v_texcoord.y-1.0/tileSize.y)).rgb +
                        unsharp_M[1][1]*col.rgb +
                        unsharp_M[1][2]*render(base,vec2(v_texcoord.x,v_texcoord.y+1.0/tileSize.y)).rgb +
                        unsharp_M[2][0]*render(base,vec2(v_texcoord.x+1.0/tileSize.x,v_texcoord.y-1.0/tileSize.y)).rgb +
                        unsharp_M[2][1]*render(base,vec2(v_texcoord.x+1.0/tileSize.x,v_texcoord.y)).rgb +
                        unsharp_M[2][2]*render(base,vec2(v_texcoord.x+1.0/tileSize.x,v_texcoord.y+1.0/tileSize.y)).rgb;
            // return vec4((col.rgb - blur) * unsharp, 1.0);
            return vec4(blur,1.0);
        }`;
    }
}

class FadeFilter extends ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = { 
            alpha: {type: 'float', needsUpdate: true, size: 1, value: 0.5},
        };
    }

    fragDataSrc(gl) {
        return `
        vec4 ${this.functionName()}(vec4 col){
            return vec4(vec3(col.rgb), alpha);
        }`;
    }
}

class SigmoidFilter extends ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = { 
            sigmoid: {type: 'float', needsUpdate: true, size: 1, value: 0.3},
        };
    }

    fragDataSrc(gl) {
        return `
        vec4 ${this.functionName()}(vec4 color){

            vec3 max_v = color.rgb;
            vec3 min_v = color.rgb;
            float win = 1.0;

            for (float i = -win; i < win+1.0; i++){
                for (float j = -1.0; j < 2.0; j++){
                    max_v = max(max_v, render(base1,vec2(v_texcoord.x+i/tileSize.x,v_texcoord.y+j/tileSize.y)).rgb);
                    min_v = min(min_v, render(base1,vec2(v_texcoord.x+i/tileSize.x,v_texcoord.y+j/tileSize.y)).rgb);
                }
            }

            vec3 out_v = (color.rgb - min_v) / (max_v - min_v);
            out_v = out_v * 2.0 - 1.0;
            out_v = exp(out_v / sigmoid) / (1.0 + exp(out_v / sigmoid));

            // vec3 out_v = (color.rgb - min_v) / (max_v - min_v);

            return vec4(out_v, 1.0);
        }`;
    }
}

class AlbedoFilter extends ShaderFilter {
    constructor(options) {
        super(options);
        this.uniforms = { 
            // albedo: {type: 'sampler2D', needsUpdate: true, size: 1, value: 10.0},
        };
    }

    fragDataSrc(gl) {
        return `
        vec4 ${this.functionName()}(vec4 col){
            vec3 alb = texture(albedo, v_texcoord).rgb;
            vec3 out_col = col.rgb * 0.5 + alb * 0.5;
            return vec4(out_col,1.0);
        }`;
    }
}

let lime = new Viewer('.openlime', { background: 'black', canvas: { preserveDrawingBuffer: true} });
lime.camera.bounded = false;

main();

function main(){

    // create openlime div
    // const openlimeDiv = document.createElement('div');
    // openlimeDiv.id = 'openlime';
    // document.querySelector('body').appendChild(openlimeDiv);

    // openlime canvas creation
    // var lime = new Viewer('#openlime', { background:'black' });
    // lime.camera.bounded = false;

    const urlParams = new URLSearchParams(window.location.search);
    const editorEnable = urlParams.has('editor');

    // Create an OpenLIME canvas into openlime
    // const lime = new Viewer('.openlime', { background: 'black', canvas: { preserveDrawingBuffer: true} });
    // lime.camera.bounded = false;

    Skin.setUrl('skin/skin.svg');

    let openlime = document.querySelector('.openlime');
    let infoDialog = new UIDialog(openlime, { modal: true });
    infoDialog.hide();

    const layer1 = new Layer({
        type: 'rti',
        url: 'assets/rti/ptm/info.json',
        layout: 'image',
        transform: { x: 0, y: 0, z: 1, a: 0 },
        zindex: 0,
        label: 'PTM',
        overlay: false,
        section: "Layers",
        shaderOptions: {
            albedo: false,
            normals: false,
            mask: false,
            secondLight: false,
            // secondLight: {
            //     intensity: [1.0, 1.0],
            //     weight: 0.5}
        }
    });
    lime.addLayer('Layer1', layer1)

    // console.log(layer1);

    const layer2 = new Layer({
        type: 'neural',
        url: 'assets/rti/neural/info.json',
        layout: 'image',
        transform: { x: 0, y: 0, z: 1, a: 0 },
        zindex: 0,
        label: 'Neural',
        overlay: false,
        section: "Layers",
        shaderOptions: {
            albedo: false,
            normals: false,
            mask: false,
            secondLight: false,
            // secondLight: {
            //     intensity: [1.0, 1.0],
            //     weight: 0.5}
        }
    });
    lime.addLayer('Layer2', layer2);
    // console.log(layer2);

    // user interface configuration
    // the "section" attribute can be omitted. This way, a single section called "Layers"
    // will be created. Otherwise, an array of strings must be given

    // Define annotation parameters
    let annotationServer = 'http://localhost:3000/ol';
    let annotationFile = 'assets/annotations/annotations.json'
    
    const classParam = {
        '': { style: { stroke: '#000' }, label: '' },
        'class1': { style: { stroke: '#770' }, label: 'A' },
        'class2': { style: { stroke: '#707' }, label: 'B' },
        'class3': { style: { stroke: '#777' }, label: 'C' },
        'class4': { style: { stroke: '#070' }, label: 'D' },
        'class5': { style: { stroke: '#007' }, label: 'E' },
        'class6': { style: { stroke: '#077' }, label: 'F' },
    };

    let aOptions = {
        label: 'Annotations',
        layout: layer1.layout,
        type: 'svg_annotations',
        style: ` 
        .openlime-annotation { pointer-events:stroke; opacity: 0.7; }
        .openlime-annotation:hover { cursor:pointer; opacity: 1.0; }

        :focus { fill:yellow; }
        path { fill:none; stroke-width:2; stroke:#000; vector-effect:non-scaling-stroke; pointer-events:all; }
        path:hover { cursor:pointer; stroke:#f00; }
        .selected { stroke-width:3; }
        `,
        annotations: annotationServer,
        // annotations: annotationFile,
        // annotations: [],
        overlay: true,
    }

    if (!editorEnable) {
        aOptions = {
            ...aOptions,
            onClick: (anno) => {
                infoDialog.setContent(`<h4>${anno.label}</h4><p>${anno.description}</p>`);
                infoDialog.show();
            },
            // classes: classParam
        }
    }

    // Create an annotation layer and add it to the canvans
    const annoLayer = new LayerAnnotation(aOptions);
    lime.addLayer('annoLayer', annoLayer);

    // If editorEnable, create a SVG annotation Editor
    // if (editorEnable) {
    //     const editor = new EditorSvgAnnotation(lime, annoLayer, {
    //         classes: classParam
    //     });
    //     editor.createCallback = (anno) => { console.log("Created annotation: ", anno); processRequest(anno, 'create'); return true; };
    //     editor.deleteCallback = (anno) => { console.log("Deleted annotation: ", anno); processRequest(anno, 'delete'); return true; };
    //     editor.updateCallback = (anno) => { console.log("Updated annotation: ", anno); processRequest(anno, 'update'); return true; };
    // }

    let ui = new UIBasic(lime, { skin: 'skin/skin.svg', showLightDirections: true});

    if (editorEnable) {
        const editor = new AnnotationEditor(lime, annoLayer, {
            // classes: classParam
        });
        editor.createCallback = (anno) => { console.log("Created annotation: ", anno); processRequest(anno, 'create'); return true; };
        editor.deleteCallback = (anno) => { console.log("Deleted annotation: ", anno); processRequest(anno, 'delete'); return true; };
        editor.updateCallback = (anno) => { console.log("Updated annotation: ", anno); processRequest(anno, 'update'); return true; };
    }

    // Add image attribution 
    ui.attribution = `CRS4 Digital Pathology Platform - <a href="https://www.crs4.it/research/visual-and-data-intensive-computing/digital-health/">CRS4 Digital Health Research Program</a>`;

    // Calback function to send http requests to the Annotation server
    async function processRequest(anno, action) {
        let method = "GET";
        let url = `${annotationServer}`;
        let body = "";
        switch (action) {
            case "create":
                method = "POST";
                url = `${annotationServer}`;
                body = JSON.stringify(anno);
                break;
            case "update":
                method = "PUT";
                url = `${annotationServer}/${anno.id}`;
                body = JSON.stringify(anno);
                break;
            case "delete":
                method = "DELETE";
                url = `${annotationServer}/${anno.id}`;
                body = "";
                break;
            default:
                break;
        }
        const response = await fetch(url, {
            method: method,
            mode: 'cors', // this cannot be 'no-cors'
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: body
        });
        if (!response.ok) {
            const message = `An error has occured: ${response.status} ${response.statusText} `;
            alert(message);
            throw new Error(message);
        }
        let json = await response.json();
        if (json.status == 'error')
            alert(json.msg);
    }



    
    ui.actions.light.active = true;
    ui.actions.layers.display = true;
    ui.actions.zoomin.display = true;
    ui.actions.zoomout.display = true;
    ui.actions.rotate.display = true;
    // ui.actions.ruler.display = true;
    ui.actions.help.display = true;
    ui.actions.snapshot.display = true;
    lime.camera.maxFixedZoom = 1;
    window.lime = lime;

    // console.log(ui);

    let filter;
    // gamma filter
    filter = new GammaFilter({label: 'Gamma', uniform: 'gamma', value: 2.2, min: 0, max: 3, step: 0.1});
    addFilter(ui, ui.menu.option, filter);
    // unsharp filter
    filter = new UnsharpFilter({label: 'Unsharp', uniform: 'unsharp', value: 10.0, min: 0, max: 20, step: 1});
    addFilter(ui, ui.menu.option, filter);
    addSecondLight(ui);


    console.log(annoLayer);


    // ui.menu.push({ section: "Filters" });
    // let filter;
    // // gamma filter
    // filter = new GammaFilter({label: 'Gamma', uniform: 'gamma', value: 2.2, min: 0, max: 3, step: 0.1});
    // addFilter(ui, filter);
    // // unsharp filter
    // filter = new UnsharpFilter({label: 'Unsharp', uniform: 'unsharp', value: 10.0, min: 0, max: 20, step: 1});
    // addFilter(ui, filter);

    // ui.menu.push({ section: "Options" });
    // addSecondLight(ui);
}

//autodetect type ------------------------------------------------------------------
async function autodetect(data_path) {
    let response = await fetch(data_path + '/plane_0.tzi');
    if(response.status == 200)
        return 'tarzoom';

    response = await fetch(data_path + '/plane_0.dzi');
    if(response.status == 200)
        return 'deepzoom';

    response = await fetch(data_path + '/planes.tzi');
    if(response.status == 200)
        return 'tarzoom';

    response = await fetch(data_path + '/plane_0.jpg');
    if(response.status == 200)
        return 'image';

    return false;
}

/*
filter = {
    object: ...,
    name: ...,
    uniform: ...,
    value: ...,
    min: ...,
    max: ...,
    step: ...
}
*/
function addFilter(ui, menu, filter){

    if (!filter){
        return;
    }
 
    let filter_active = false;
    let filter_value = filter.value; 

    const button = {
        button: filter.label,
        onclick: () => { 
            filter_active = !filter_active;

            if (filter_active){
                for (let layer of Object.values(lime.canvas.layers)){
                    layer.shader.addFilter(filter);
                    layer.shader.setUniform(filter.uniform, filter_value);
                }
            }
            else{
                for (let layer of Object.values(lime.canvas.layers)){
                    layer.shader.removeFilter(filter.name);
                }
            }
            ui.updateMenu(menu); // Update menu (run status() callback)
        },
        status: () => {
            return filter_active ? 'active' : '';
        }
    };
    menu.list.push(button);

    const slider = {
        html: `<input id="${filter.label}Slider" type="range" min="${filter.min}" max="${filter.max}" value=${filter_value} step="${filter.step}">
            <output id="${filter.label}SliderOutput">${filter_value}</output>`,

        onchange: () => {
            filter_value = document.querySelector(`#${filter.label}Slider`).value;
            document.querySelector(`#${filter.label}SliderOutput`).textContent = filter_value;
            if (filter_active){
                for (let layer of Object.values(lime.canvas.layers)){
                    layer.shader.setUniform(filter.uniform, filter_value);
                }
            }
        }
    };
    menu.list.push(slider);
}

function addSecondLight(ui){
    let secondLight = false;
    const button = {
        button: "Second Light",
        onclick: () => { 
            secondLight = !secondLight;
            for (let layer of Object.values(lime.canvas.layers)){
                // console.log(layer, secondLight);
                layer.shader.secondLight = secondLight;
                layer.shader.needsUpdate = true;
                layer.shader.emit('update');
            }
            ui.updateMenu(ui.menu.option); // Update menu (run status() callback)
        },
        status: () => {
            return secondLight ? 'active' : '';
        }
    };
    ui.menu.option.list.push(button);
}

// ------------------------------------------------------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------------------------------------------------------
