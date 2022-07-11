import { Annotation } from './Annotation.js'

class SvgAnnotationUI {
    constructor(container) {
        Object.assign(this, {
            tools: ["rect", "circle", "line", "curve", "text", "pin", "eraser"],
            properties: [ 
                { name: "fill", label: "Fill", type: "color" },
                { name: "stroke", label: "Stroke", type: "color" },
                { name: "width", label: "Width", type: "number" },
                { name: "opacity", label: "Opacity", type: "number" },
                { name: "corners", label: "Corners", type: "number" },
                { name: "font-size", label: "Font size", type: "number" }
            ]
        })
        this.container = container;
        let toolbar = this.toolbar();
        let svgTools = this.svgTools();
        let svgProperties = this.svgProperties();
        container.innerHTML = `
            <p class="openlime-input"><input placeholder="Label" name="label" type="text" class="openlime-text-input"/></p>
            <div class="openlime-svg-tools-panel">
                <div class="openlime-svg-tools">
                ${svgTools}
                </div>
                <div class="openlime-svg-properties">
                ${svgProperties}
                </div>
            </div>
            ${toolbar}
        `    
        this.label = container.querySelector('[name=label]');
    }
    setAnnotation(anno) {
        this.label.value = anno.label;
    }

    toolbar() {
        let str = `<div class="openlime-annotation-toolbar">`
        str += ['undo', 'redo', 'save-svg', 'import-svg', 'clear-screen'].map( t => 
             `<svg data-icon=".openlime-${t}"/>`).join('\n');
        str += `</div>`;
        return str;
    }
    svgTools() {
        return this.tools.map( t => `<svg data-icon=".openlime-${t}"/>`).join('\n');
    }
    svgProperties() {
        let str = ``
        for(let p of this.properties) 
            str += `<p>${p.label}: <input name="${p.name}" type="${p.type}"></p>\n`;
        
        return str;
    }
}

export { SvgAnnotationUI }