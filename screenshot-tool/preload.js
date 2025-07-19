const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Screenshot functionality
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  saveScreenshot: (dataURL) => ipcRenderer.invoke('save-screenshot', dataURL),
  
  // Window management
  showDashboard: () => ipcRenderer.invoke('show-dashboard'),
  showTracker: () => ipcRenderer.invoke('show-tracker'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSaveDirectory: () => ipcRenderer.invoke('set-save-directory'),
  
  // Screenshot database
  getScreenshots: () => ipcRenderer.invoke('get-screenshots'),
  deleteScreenshot: (id) => ipcRenderer.invoke('delete-screenshot', id),
  openScreenshot: (id) => ipcRenderer.invoke('open-screenshot', id),
  
  // Internship tracker
  getInternships: () => ipcRenderer.invoke('get-internships'),
  addInternship: (internshipData) => ipcRenderer.invoke('add-internship', internshipData),
  updateInternship: (id, updates) => ipcRenderer.invoke('update-internship', id, updates),
  deleteInternship: (id) => ipcRenderer.invoke('delete-internship', id),
  
  // Job information extraction
  processJobInfo: (screenshotPath) => ipcRenderer.invoke('process-job-info', screenshotPath),
  analyzeJobScreenshot: (id) => ipcRenderer.invoke('analyze-job-screenshot', id),
  
  // Enhanced Cluely-inspired methods
  setToolbarOpacity: (opacity) => ipcRenderer.invoke('set-toolbar-opacity', opacity),
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  showContextMenu: (x, y) => ipcRenderer.invoke('show-context-menu', x, y),
  hideToolbar: () => ipcRenderer.invoke('hide-toolbar'),
  saveToolbarPosition: (x, y) => ipcRenderer.invoke('save-toolbar-position', x, y),
  
  // Context awareness
  detectJobSite: () => ipcRenderer.invoke('detect-job-site'),
  
  // Window drag functionality
  startDrag: () => ipcRenderer.send('toolbar-drag'),
  
  // Event listeners
  onTriggerCapture: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('trigger-capture');
    ipcRenderer.on('trigger-capture', () => callback());
    return unsubscribe;
  },
  
  onTriggerAnalyze: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('trigger-analyze');
    ipcRenderer.on('trigger-analyze', () => callback());
    return unsubscribe;
  },
  
  onShowSettings: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('show-settings');
    ipcRenderer.on('show-settings', () => callback());
    return unsubscribe;
  },
  
  onScreenshotAdded: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('screenshot-added');
    ipcRenderer.on('screenshot-added', (_, screenshot) => callback(screenshot));
    return unsubscribe;
  },
  
  onJobData: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('job-data');
    ipcRenderer.on('job-data', (_, jobData) => callback(jobData));
    return unsubscribe;
  },
  
  onInternshipsUpdated: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('internships-updated');
    ipcRenderer.on('internships-updated', () => callback());
    return unsubscribe;
  },
  
  onContextChange: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('context-changed');
    ipcRenderer.on('context-changed', (_, context) => callback(context));
    return unsubscribe;
  },
  
  // Global shortcuts
  onGlobalShortcut: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('trigger-capture');
    ipcRenderer.on('trigger-capture', () => callback());
    return unsubscribe;
  },
  
  onAnalyzeShortcut: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('trigger-analyze');
    ipcRenderer.on('trigger-analyze', () => callback());
    return unsubscribe;
  }
}); 