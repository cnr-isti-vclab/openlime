# OpenLIME Manifest Format

## Panoramica

Il **OpenLIME Manifest** è un formato JSON che permette di descrivere in modo dichiarativo un'istanza completa di un viewer OpenLIME. L'obiettivo è standardizzare la configurazione dei viewer e permettere la creazione dinamica di visualizzazioni complesse attraverso un semplice file di configurazione.

## Principi di Design

### 1. **Separazione delle Responsabilità**
- **Viewer**: Configurazione del container principale e della camera
- **Layers**: Definizione dei layer e delle loro proprietà
- **Shaders**: Configurazione degli shader e degli effetti
- **Controllers**: Gestione dell'interazione utente
- **UI**: Interfaccia utente e controlli
- **Connections**: Relazioni e dipendenze tra componenti

### 2. **Modularità e Riusabilità**
- Ogni componente è definito separatamente
- Riferimenti tramite ID per collegare i componenti
- Shader riutilizzabili tra diversi layer
- Template riutilizzabili per diversi progetti

### 3. **Estensibilità**
- Schema flessibile che supporta proprietà custom
- Sistema di plugin per funzionalità aggiuntive
- Event handler personalizzabili
- Supporto per shader custom

## Struttura del Manifest

### Sezioni Principali

#### **metadata** (opzionale)
Informazioni descrittive sul viewer:
```json
{
  "metadata": {
    "title": "Nome del Viewer",
    "description": "Descrizione dettagliata",
    "author": "Autore",
    "created": "2025-12-18T10:00:00Z",
    "tags": ["tag1", "tag2"]
  }
}
```

#### **viewer** (obbligatorio)
Configurazione del viewer principale:
```json
{
  "viewer": {
    "container": ".openlime",           // CSS selector
    "background": "#f5f5f5",           // Background CSS
    "autofit": true,                   // Auto-fit camera
    "idleTime": 60,                    // Idle timeout
    "camera": {                        // Camera settings
      "bounded": true,
      "minZoom": 0.1,
      "maxZoom": 10.0
    }
  }
}
```

#### **layers** (obbligatorio)
Definizione dei layer indicizzati per ID:
```json
{
  "layers": {
    "background": {
      "type": "image",                 // Layer type
      "layout": "deepzoom",           // Layout type
      "url": "image.dzi",             // Resource URL
      "visible": true,                // Visibility
      "zindex": 0,                    // Stacking order
      "transform": {                  // Transformation
        "x": 0, "y": 0, "z": 1, "a": 0
      },
      "viewport": {                   // Viewport (for split view)
        "x": 0, "y": 0, "dx": 0.5, "dy": 1.0
      },
      "shader": "myShader",           // Shader reference
      "options": {}                   // Layer-specific options
    }
  }
}
```

#### **shaders** (opzionale)
Configurazione degli shader:
```json
{
  "shaders": {
    "diffShader": {
      "type": "combiner",
      "mode": "diff",
      "uniforms": {
        "uMixFactor": 0.5
      }
    }
  }
}
```

#### **controllers** (opzionale)
Configurazione dei controller di input:
```json
{
  "controllers": [
    {
      "type": "light",
      "target": "rtiLayer",
      "options": {
        "lightType": "sphere",
        "enableDragging": true
      }
    }
  ]
}
```

#### **ui** (opzionale)
Configurazione dell'interfaccia utente:
```json
{
  "ui": {
    "type": "basic",
    "skin": { "url": "skin/skin.svg" },
    "actions": {
      "zoomin": { "display": true },
      "light": { "display": false }
    },
    "attribution": "Copyright notice"
  }
}
```

#### **connections** (opzionale)
Relazioni tra componenti:
```json
{
  "connections": {
    "lenses": [
      {
        "source": "layer1",
        "target": "lensLayer",
        "type": "magnify",
        "radius": 150
      }
    ],
    "synchronization": [
      {
        "layers": ["layer1", "layer2"],
        "properties": ["transform", "zoom"]
      }
    ]
  }
}
```

## Tipi di Layer Supportati

### **image**
Layer per immagini statiche o tiled:
- `layout`: `image`, `deepzoom`, `tarzoom`
- `url`: Path dell'immagine o descrittore (es. `.dzi`)

### **rti/ptm**
Layer per Reflectance Transformation Imaging:
- `layout`: `rti`, `ptm`
- `url`: File RTI/PTM
- Supporta controlli per illuminazione

### **combiner**
Layer per combinare altri layer:
- `layers`: Array di ID dei layer da combinare
- `shader`: Shader per la combinazione

### **annotation**
Layer per annotazioni:
- `url`: File JSON con annotazioni
- Supporta editing e visualizzazione

### **lens**
Layer per lenti di ingrandimento:
- Collegato ad altri layer tramite `connections`

## Tipi di Controller

- **pan**: Controllo di traslazione
- **pinch**: Controllo di zoom
- **rotate**: Controllo di rotazione
- **light**: Controllo dell'illuminazione (per RTI/PTM)
- **annotationController**: Gestione delle annotazioni

## Sistema di Eventi

Il manifest supporta la configurazione di:

### **Gesture Events**
```json
{
  "events": {
    "gestures": {
      "fingerSingleTap": {
        "enabled": true,
        "priority": 100,
        "handler": "handleTap"
      }
    }
  }
}
```

### **Custom Events**
```json
{
  "events": {
    "custom": [
      {
        "event": "lightChanged",
        "target": "rtiLayer",
        "handler": "updateShader"
      }
    ]
  }
}
```

## Plugin System

Il manifest supporta plugin esterni:
```json
{
  "plugins": [
    {
      "name": "measurementTool",
      "url": "plugins/measurement.js",
      "config": {
        "units": "mm",
        "precision": 2
      }
    }
  ]
}
```

## Esempi di Utilizzo

### Viewer Semplice
Per un viewer basic con una sola immagine, è sufficiente:
```json
{
  "version": "1.0.0",
  "viewer": { "container": ".openlime" },
  "layers": {
    "main": {
      "type": "image",
      "url": "image.jpg"
    }
  }
}
```

### Viewer RTI con Controlli Luce
```json
{
  "version": "1.0.0",
  "viewer": { "container": ".openlime" },
  "layers": {
    "artifact": {
      "type": "rti",
      "url": "artifact.rti"
    }
  },
  "controllers": [
    {
      "type": "light",
      "target": "artifact"
    }
  ],
  "ui": {
    "actions": {
      "light": { "display": true }
    }
  }
}
```

## Implementazione della Classe ManifestLoader

Una volta definito il manifest, l'implementazione potrebbe seguire questo pattern:

```javascript
class OpenLIMEManifestLoader {
  static async load(manifestUrl) {
    const response = await fetch(manifestUrl);
    const manifest = await response.json();
    
    return this.createViewer(manifest);
  }
  
  static createViewer(manifest) {
    // 1. Crea il viewer
    const viewer = new OpenLIME.Viewer(
      manifest.viewer.container, 
      manifest.viewer
    );
    
    // 2. Crea e aggiungi layer
    for (const [id, config] of Object.entries(manifest.layers)) {
      const layer = this.createLayer(config, manifest.shaders);
      viewer.addLayer(id, layer);
    }
    
    // 3. Configura controller
    for (const controller of manifest.controllers || []) {
      const ctrl = this.createController(controller);
      viewer.addController(ctrl);
    }
    
    // 4. Configura UI
    if (manifest.ui) {
      this.setupUI(viewer, manifest.ui);
    }
    
    // 5. Configura connections
    if (manifest.connections) {
      this.setupConnections(viewer, manifest.connections);
    }
    
    return viewer;
  }
  
  // ... metodi helper per creare componenti
}
```

## Validazione

Il manifest può essere validato contro lo schema JSON fornito usando librerie standard come `ajv`:

```javascript
import Ajv from 'ajv';
import manifestSchema from './openlime-manifest-schema.json';

const ajv = new Ajv();
const validate = ajv.compile(manifestSchema);

function validateManifest(manifest) {
  const valid = validate(manifest);
  if (!valid) {
    throw new Error('Invalid manifest: ' + ajv.errorsText(validate.errors));
  }
  return true;
}
```

## Vantaggi del Manifest

1. **Standardizzazione**: Formato uniforme per tutte le configurazioni
2. **Riusabilità**: Template riutilizzabili tra progetti
3. **Manutenibilità**: Separazione tra logica e configurazione
4. **Debuggabilità**: Configurazione leggibile e modificabile
5. **Versionabilità**: Possibilità di versioning delle configurazioni
6. **Validazione**: Schema JSON per validazione automatica
7. **Documentazione**: Configurazione auto-documentante

Questo approccio permetterà di creare rapidamente viewer complessi senza dover scrivere codice imperativo, rendendo OpenLIME più accessibile e facilitando la creazione di visualizzazioni standardizzate per il patrimonio culturale.
