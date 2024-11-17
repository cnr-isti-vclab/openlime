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

### Development Setup
1. Clone or download this repository to your local machine.
2. Navigate to the project directory in your terminal:
   ```bash
   cd path/to/electron-editor
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

### Building Standalone Application
To create standalone executables for different platforms:

1. For all platforms:
   ```bash
   npm run build
   ```

2. For specific platforms:
   ```bash
   # For Windows
   npm run build:win
   
   # For macOS
   npm run build:mac
   
   # For Linux
   npm run build:linux
   ```

The built applications will be available in the `dist` directory.

## Usage

### Development Mode
1. Start the application:
   ```bash
   npm start
   ```

2. To use the editor in a specific mode (e.g., editor mode), run:
   ```bash
   npm run editor
   ```

### Standalone Application

#### Running the Application
- **Windows**: Run the installed `.exe` file or use the Start Menu shortcut
- **macOS**: Open the `.app` from Applications folder
- **Linux**: Run the AppImage:
  ```bash
  ./OpenLIME\ Electron\ Editor-1.0.0.AppImage
  ```

To run in editor mode:
- **Windows**: Use the "Editor Mode" shortcut or run from command line:
  ```bash
  "C:\Program Files\OpenLIME Electron Editor\OpenLIME Electron Editor.exe" --editor
  ```
- **macOS**: From terminal:
  ```bash
  /Applications/OpenLIME\ Electron\ Editor.app/Contents/MacOS/OpenLIME\ Electron\ Editor --editor
  ```
- **Linux**:
  ```bash
  ./OpenLIME\ Electron\ Editor-1.0.0.AppImage --editor
  ```

#### Accessing Annotation Data
Annotations are stored in a user-specific data directory. You can access this directory through:
1. The application menu: `File > Open Data Directory`
2. Manual navigation to:
   - **Windows**: `%APPDATA%\OpenLIME Electron Editor\data`
   - **macOS**: `~/Library/Application Support/OpenLIME Electron Editor/data`
   - **Linux**: `~/.config/OpenLIME Electron Editor/data`

The annotations are stored in `anno.json` within the data directory.

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

  The `Annotation.js` file provides a structure for an OpenLIME annotation, including features like a unique identifier, description, category, drawing style, and potentially embedded graphical elements.

  Example in the frontend (`index.js`):
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

  Example in `preload.js`:
   ```javascript
   const { ipcRenderer, contextBridge } = require('electron');

   contextBridge.exposeInMainWorld('api', {
       createAnnotation: (annotation) => ipcRenderer.send('create-annotation', annotation),
   });
   ```

  Example in `main.js`:
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