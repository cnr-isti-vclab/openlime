// Utilities
function formatPerformanceTime() {
  // Get current timestamp in milliseconds since page load
  const perfTime = performance.now();
  
  // Add it to the page load timestamp to get current time
  const timestamp = performance.timeOrigin + perfTime;
  
  // Create date object
  const date = new Date(timestamp);
  
  // Format each component with padding
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hours}-${minutes}`;
}

//########################################################################

// Check URL parameters
const urlParams = new URLSearchParams(window.location.search);
const editorEnable = urlParams.has('editor');
if (editorEnable) {
  console.log("Running in editor mode");
} else {
  console.log("Running in default mode");
}

// Create an OpenLIME canvas into openlime
const lime = new OpenLIME.Viewer('.openlime');
lime.camera.bounded = false;

// Fetch a (custom) skin. A skin is a set of visual elements for the web page.
OpenLIME.Skin.setUrl('skin/skin.svg');

// Create a custom dialog
let openlime = document.querySelector('.openlime');
let infoDialog = new OpenLIME.UIDialog(openlime, { modal: true });
infoDialog.hide();

// Create an image layer and add it to the canvans
const layer = new OpenLIME.Layer({
  type: 'image',
  layout: 'image',
  url: 'img/lighthouse-kdmap.jpg'
});
lime.addLayer('Base', layer);

// Define annotation parameters

async function loadAnnotations() {
  try {
    const annotations = await window.electronAPI.readAnnotations();
    // If annotations is null or undefined, return empty array
    return annotations || [];
  } catch (error) {
    console.error('Error loading annotations:', error);
    // Return empty array in case of error
    return [];
  }
}

const classParam = {
  '': { stroke: '#000', label: '' },
  'class1': { stroke: '#770', label: 'A' },
  'class2': { stroke: '#707', label: 'B' },
  'class3': { stroke: '#777', label: 'C' },
  'class4': { stroke: '#070', label: 'D' },
  'class5': { stroke: '#007', label: 'E' },
  'class6': { stroke: '#077', label: 'F' },
};

(async function initializeAnnotations() {
  try {
    const annotations = await loadAnnotations();
    aOptions = {
      type: 'svg_annotations',
      layout: layer.layout,
      style: `
        path { cursor:pointer; fill: rgba(32, 32, 32, 0.8); stroke: #aaa; stroke-width:2px; vector-effect:non-scaling-stroke; }
        text { cursor:pointer; user-select: none; font-family:arial; stroke-width:1px; font-size:6px; fill:#fff; alignment-baseline:middle; text-anchor:middle; }
        .line { cursor:pointer; fill: none; stroke: #aaa; stroke-width:4px; vector-effect:non-scaling-stroke; }
        .pin text { stroke: none; }
        .selected.line { stroke: #f00; }
        `,
      annotationUpdate: (anno, transform) => {
        let size = 36 / transform.z;
        anno.elements.forEach(e => { e.setAttribute('width', size + 'px'); e.setAttribute('height', size + 'px'); });
      },
      annotations: annotations
    };

    if (!editorEnable) {
      aOptions = {
        ...aOptions,
        onClick: (anno) => {
          infoDialog.setContent(`<h4>${anno.label}</h4><p>${anno.description}</p>`);
          infoDialog.show();
        },
        customData: (anno) => {
          anno.data.date = formatPerformanceTime();
        },
        classes: classParam
      }
    }

    // Create an annotation layer and add it to the canvans
    const annoLayer = new OpenLIME.LayerAnnotation(aOptions);
    lime.addLayer('anno', annoLayer);

    if (editorEnable) {
      const editor = new OpenLIME.EditorSvgAnnotation(lime, annoLayer, {
        classes: classParam
      });
      editor.createCallback = (anno) => {
        console.log("Created annotation: ", anno);
        anno.data = {};
        processRequest(anno, 'create');
        return true;
      };
      editor.deleteCallback = (anno) => {
        console.log("Deleted annotation: ", anno);
        processRequest(anno, 'delete');
        return true;
      };
      editor.updateCallback = (anno) => {
        console.log("Updated annotation: ", anno);
        processRequest(anno, 'update');
        return true;
      };
    }
  } catch (error) {
    console.error('Failed to load annotations:', error);
  }

  // Create an User Interface 
  const ui = new OpenLIME.UIBasic(lime);

  // Get a subset of pre-defined actions to work on it
  let { help, home, layers, fullscreen, light, zoomin, zoomout } = ui.actions

  // Remove light from the toolbar
  light.display = false;

  // Add help, zoomin and zoomout to the toolbar
  help.display = true;
  zoomin.display = true;
  zoomout.display = true;

  // Add configured actions to the toolbar
  ui.actions = { help, home, layers, fullscreen, light, zoomin, zoomout };

  // Add image attribution 
  ui.attribution = "";

  // Calback function to send requests to the backend
  async function processRequest(anno, action) {
    try {
      let result;
      switch (action) {
        case "create":
          result = await window.electronAPI.createAnnotation(anno);
          break;
        case "update":
          result = await window.electronAPI.updateAnnotation(anno);
          break;
        case "delete":
          result = await window.electronAPI.deleteAnnotation(anno.id);
          break;
        default:
          throw new Error('Azione non supportata');
      }
    }
    catch (error) {
      console.error('Errore durante l\'operazione:', error);
      alert('Errore durante l\'operazione');
    }
  }

})();
