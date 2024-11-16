const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readAnnotations: () => ipcRenderer.invoke('read-annotations'),
  createAnnotation: (annotation) => ipcRenderer.invoke('create-annotation', annotation),
  updateAnnotation: (annotation) => ipcRenderer.invoke('update-annotation', annotation),
  deleteAnnotation: (id) => ipcRenderer.invoke('delete-annotation', id)
});
