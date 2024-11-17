// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Proper argument handling for both development and packaged modes
function getIsEditorMode() {
  if (process.defaultApp) {
    return process.argv.slice(2).some(arg => arg === '--editor');
  } else {
    return process.argv.slice(1).some(arg => arg === '--editor');
  }
}

// Get the user data directory path
const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'data');
const annotationFile = path.join(dataDir, 'anno.json');

console.log("App launched with arguments:", process.argv);
console.log("Editor mode:", getIsEditorMode());
console.log("User data directory:", userDataPath);
console.log("Data directory:", dataDir);

let annotations = [];

// Initialize annotations
try {
  // Check if data directory exists, if not create it
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
  }

  // Check if file exists
  if (!fs.existsSync(annotationFile)) {
    // Create file with empty array
    fs.writeFileSync(annotationFile, '[]', 'utf8');
    console.log('Created annotations file:', annotationFile);
  } else {
    // Read existing file
    const data = fs.readFileSync(annotationFile, 'utf8');
    // If file is empty or invalid JSON, initialize with empty array
    annotations = data.trim() ? JSON.parse(data) : [];
    if (!Array.isArray(annotations)) {
      annotations = [];
      fs.writeFileSync(annotationFile, '[]', 'utf8');
    }
    console.log('Loaded existing annotations');
  }
} catch (err) {
  console.error('Error initializing annotations file:', err);
  annotations = [];
  try {
    fs.writeFileSync(annotationFile, '[]', 'utf8');
  } catch (writeErr) {
    console.error('Error writing initial annotations file:', writeErr);
  }
}

// Create the main window
function createWindow() {
  const isEditorMode = getIsEditorMode();
  const queryParams = isEditorMode ? new URLSearchParams({ editor: 'true' }).toString() : "";
  const indexPath = `file://${path.join(__dirname, 'index.html')}?${queryParams}`;

  const win = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
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

  // Add menu item to open data directory
  const { Menu, MenuItem } = require('electron');
  const menu = Menu.getApplicationMenu() || Menu.buildFromTemplate([]);
  
  const fileMenu = menu.items.find(item => item.label === 'File') || 
                  new MenuItem({ label: 'File', submenu: [] });
  
  fileMenu.submenu.append(new MenuItem({
    label: 'Open Data Directory',
    click: () => {
      require('electron').shell.openPath(dataDir);
    }
  }));

  if (!menu.items.find(item => item.label === 'File')) {
    menu.append(fileMenu);
  }
  
  Menu.setApplicationMenu(menu);
}

// Handle the 'second-instance' event
app.on('second-instance', (event, commandLine, workingDirectory) => {
  const isEditorMode = commandLine.slice(1).some(arg => arg === '--editor');
  const existingWindows = BrowserWindow.getAllWindows();
  
  if (existingWindows.length > 0) {
    const win = existingWindows[0];
    if (win.isMinimized()) win.restore();
    win.focus();
    
    // Reload the window with new mode if necessary
    const currentURL = new URL(win.webContents.getURL());
    const currentIsEditor = currentURL.searchParams.has('editor');
    
    if (currentIsEditor !== isEditorMode) {
      const queryParams = isEditorMode ? new URLSearchParams({ editor: 'true' }).toString() : "";
      const indexPath = `file://${path.join(__dirname, 'index.html')}?${queryParams}`;
      win.loadURL(indexPath);
    }
  }
});

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(createWindow);
}

// IPC Handlers
ipcMain.handle('read-annotations', async () => {
  try {
    const data = fs.readFileSync(annotationFile, 'utf8');
    return data.trim() ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error in reading JSON file:', err);
    return [];
  }
});

ipcMain.handle('create-annotation', async (event, newAnnotation) => {
  try {
    annotations.push(newAnnotation);
    fs.writeFileSync(annotationFile, JSON.stringify(annotations, null, 2));
    return { status: 'success' };
  } catch (err) {
    console.error('Error while creating the annotation:', err);
    throw err;
  }
});

ipcMain.handle('update-annotation', async (event, updatedAnnotation) => {
  try {
    const index = annotations.findIndex(anno => anno.id === updatedAnnotation.id);
    if (index !== -1) {
      annotations[index] = updatedAnnotation;
      fs.writeFileSync(annotationFile, JSON.stringify(annotations, null, 2));
      return { status: 'success' };
    } else {
      throw new Error('Annotation not found');
    }
  } catch (err) {
    console.error('Error while updating the annotation:', err);
    throw err;
  }
});

ipcMain.handle('delete-annotation', async (event, annotationId) => {
  try {
    annotations = annotations.filter(anno => anno.id !== annotationId);
    fs.writeFileSync(annotationFile, JSON.stringify(annotations, null, 2));
    return { status: 'success' };
  } catch (err) {
    console.error('Error while deleting the annotation:', err);
    throw err;
  }
});

// Handle app activation
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});