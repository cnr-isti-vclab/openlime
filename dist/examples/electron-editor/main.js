// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Definisci il percorso al file JSON
const annotationFile = path.join(__dirname, 'data', 'anno.json');
let annotations = [];
// Initialize annotations
try {
  // Check if data directory exists, if not create it
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // Check if file exists
  if (!fs.existsSync(annotationFile)) {
    // Create file with empty array
    fs.writeFileSync(annotationFile, '[]', 'utf8');
  } else {
    // Read existing file
    const data = fs.readFileSync(annotationFile, 'utf8');
    // If file is empty or invalid JSON, initialize with empty array
    annotations = data.trim() ? JSON.parse(data) : [];
    if (!Array.isArray(annotations)) {
      annotations = [];
      fs.writeFileSync(annotationFile, '[]', 'utf8');
    }
  }
} catch (err) {
  console.error('Error initializing annotations file:', err);
  // Initialize with empty array in case of error
  annotations = [];
  try {
    fs.writeFileSync(annotationFile, '[]', 'utf8');
  } catch (writeErr) {
    console.error('Error writing initial annotations file:', writeErr);
  }
}

// Funzione per creare la finestra principale
function createWindow() {

  const args = process.argv.slice(2);
  const editorArgs = args.find(arg => arg.startsWith('--editor'));
  const isEditorMode = editorArgs ? true : false;
  const queryParams = isEditorMode ? new URLSearchParams({ editor: isEditorMode }).toString() : "";
  const indexPath = `file://${path.join(__dirname, 'index.html')}?${queryParams}`;


  const win = new BrowserWindow({
    webPreferences: {
      contextIsolation: true, // Keep this enabled for security
      enableRemoteModule: false, // Disable unless absolutely necessary
      nodeIntegration: false, // Use preload for secure Node.js access
      preload: path.join(__dirname, 'preload.js'), // Use a preload script
      webSecurity: true // Disable this to allow loading local resources
    }
  });

  win.loadURL(indexPath);

  // Add keyboard shortcut for DevTools
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}

// Avvia l'applicazione quando Electron è pronto
app.on('ready', createWindow);

// Handler per leggere le annotazioni
ipcMain.handle('read-annotations', async () => {
  try {
    const data = fs.readFileSync(annotationFile, 'utf8');
    // Handle empty file or whitespace-only content
    if (!data.trim()) {
      return [];
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Errore nella lettura del file JSON:', err);
    // If there's a JSON parsing error or any other error, return empty array
    return [];
  }
});

// Handler per creare una nuova annotazione
ipcMain.handle('create-annotation', async (event, newAnnotation) => {
  try {
    annotations.push(newAnnotation);
    fs.writeFileSync(annotationFile, JSON.stringify(annotations, null, 2));
    return { status: 'success' };
  } catch (err) {
    console.error('Errore durante la creazione dell\'annotazione:', err);
    throw err;
  }
});

// Handler per aggiornare un'annotazione esistente
ipcMain.handle('update-annotation', async (event, updatedAnnotation) => {
  try {
    const index = annotations.findIndex(anno => anno.id === updatedAnnotation.id);
    if (index !== -1) {
      annotations[index] = updatedAnnotation;
      fs.writeFileSync(annotationFile, JSON.stringify(annotations, null, 2));
      return { status: 'success' };
    } else {
      throw new Error('Annotazione non trovata');
    }
  } catch (err) {
    console.error('Errore durante l\'aggiornamento dell\'annotazione:', err);
    throw err;
  }
});

// Handler per cancellare un'annotazione
ipcMain.handle('delete-annotation', async (event, annotationId) => {
  try {
    annotations = annotations.filter(anno => anno.id !== annotationId);
    fs.writeFileSync(annotationFile, JSON.stringify(annotations, null, 2));
    return { status: 'success' };
  } catch (err) {
    console.error('Errore durante la cancellazione dell\'annotazione:', err);
    throw err;
  }
});
