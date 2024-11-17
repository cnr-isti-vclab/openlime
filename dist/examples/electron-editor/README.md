# OpenLIME - Standalone Annotation Editor

This application is a lightweight, Electron-based annotation editor. It enables users to create, read, update, and delete annotations with a focus on simplicity and cross-platform compatibility through the Electron framework.

The editor integrates OpenLIME structures to handle annotations that can include graphical SVG elements. These annotations are dynamically rendered onto a canvas using a designated layer (`LayerSvgAnnotation`), allowing for enhanced visualization and interaction with graphical content.

## Features
- **Read Annotations**: View existing annotations.
- **Create Annotations**: Add new annotations with title, content, and position.
- **Update Annotations**: Edit existing annotations.
- **Delete Annotations**: Remove annotations as needed.

## Installation

### Prerequisites
- OpenLIME
- [Node.js](https://nodejs.org/) (v16 or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Steps
1. Clone or download this repository to your local machine.
2. Navigate to the project directory in your terminal:
   ```bash
   cd path/to/electron-editor
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

## Usage
1. Start the application:
   ```bash
   npm start
   ```
   This will launch the annotation editor in an Electron window.

2. To use the editor in a specific mode (e.g., editor mode), run:
   ```bash
   npm run editor
   ```

3. Begin creating, editing, and managing your annotations within the application interface.

## How It Works

### Main.js
The `main.js` file is the entry point for the Electron application. It handles:
- **Initializing the Electron app**: Setting up the main process and creating the application window.
- **Window Management**: Creating the browser window that loads the front-end (defined in `index.html`).
- **Preloading Scripts**: Securely injecting the `preload.js` script to enable controlled communication between the main process and the renderer process.
- **Data Management**: Acts as the backend for the application, managing data operations (such as annotations) and passing data between the main process and the web application.

### Data Flow
1. **Backend (Main.js)**:
   - Data such as annotations are maintained and manipulated here.
   - Uses IPC (Inter-Process Communication) to interact with the renderer process.

2. **Frontend (Index.html)**:
   - The web app defined in `index.html` provides the user interface for interacting with annotations.
   - It receives data and updates from the backend via `preload.js`.

3. **Preload.js**:
   - Acts as a secure bridge between the main process (`main.js`) and the renderer process (`index.html`).
   - Exposes specific functions to the frontend to send or receive data securely.

### Communication Between Backend and Frontend
- **Backend to Frontend**: 
  The main process sends data (e.g., annotations) to the renderer process using Electron's `ipcMain` and `ipcRenderer` modules.
  
  Example in `main.js`:
  ```javascript
  const { ipcMain } = require('electron');

  ipcMain.handle('get-annotations', async () => {
      return annotations; // Replace with actual annotation data
  });
  ```

  Example in `preload.js`:
  ```javascript
  const { ipcRenderer, contextBridge } = require('electron');

  contextBridge.exposeInMainWorld('api', {
      getAnnotations: () => ipcRenderer.invoke('get-annotations'),
  });
  ```

  Example in the frontend (`index.js`):
  ```javascript
  window.api.getAnnotations().then((annotations) => {
      console.log(annotations);
      // Populate the UI with annotation data
  });
  ```


- **Frontend to Backend**: 

The `Annotation.js` file provides a structure for an OpenLIME annotation, including features like a unique identifier, description, category, drawing style, and potentially embedded graphical elements. I'll use this structure as a reference in the "Communication Between Backend and Frontend" section.

The backend (`main.js`) and frontend (`index.js`) work together to handle the creation of OpenLIME annotations, including SVG graphical elements. Below is an example:

The user interacts with the UI to define an annotation and its associated SVG data. The structure matches the OpenLIME `Annotation` class.

   ```javascript
   const newAnnotation = {
       id: "annotation-1", // Unique identifier
       description: "This is a graphical annotation",
       category: "example",
       style: {
           stroke: "black",
           fill: "red",
       },
       content: "<svg><circle cx='50' cy='50' r='40' stroke='black' fill='red'/></svg>", // SVG content
       position: { x: 10, y: 20 },
   };

   // Send the annotation to the backend
   window.api.createAnnotation(newAnnotation);
   ```

**Preload.js**: Exposes an API for secure communication.

   ```javascript
   const { ipcRenderer, contextBridge } = require('electron');

   contextBridge.exposeInMainWorld('api', {
       createAnnotation: (annotation) => ipcRenderer.send('create-annotation', annotation),
   });
   ```

**Backend (Main.js)**: Receives the annotation, stores it in memory, and sends it back for rendering.

   ```javascript
   const { ipcMain } = require('electron');
   const annotations = []; // In-memory storage

   ipcMain.on('create-annotation', (event, annotation) => {
       // Add the annotation to the storage
       annotations.push(annotation);
       console.log('Annotation added:', annotation);
   });
   ```

This flow ensures that the OpenLIME annotation structure is preserved from creation to rendering, allowing graphical SVG elements to be displayed on a designated canvas layer using OpenLIME's capabilities.