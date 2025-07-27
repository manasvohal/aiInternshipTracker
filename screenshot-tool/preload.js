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
  clearScreenshots: () => ipcRenderer.invoke('clear-screenshots'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

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

  // Window positioning and resizing methods
  moveWindow: (x, y) => ipcRenderer.invoke('move-window', x, y),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),

  // Context awareness
  detectJobSite: () => ipcRenderer.invoke('detect-job-site'),

  // Window drag functionality
  startDrag: () => ipcRenderer.send('toolbar-drag'),
  emailInitialize: () => ipcRenderer.invoke('email-initialize'),
  emailSetupCredentials: () => ipcRenderer.invoke('email-setup-credentials'),
  emailStartAuth: () => ipcRenderer.invoke('email-start-auth'),
  emailTestConnection: () => ipcRenderer.invoke('email-test-connection'),
  emailGetAuthStatus: () => ipcRenderer.invoke('email-get-auth-status'),

  // Email Scanning Methods
  emailQuickScan: () => ipcRenderer.invoke('email-quick-scan'),
  emailDeepScan: () => ipcRenderer.invoke('email-deep-scan'),
  emailScanInternships: (options) => ipcRenderer.invoke('email-scan-internships', options),

  // Email Data Methods
  emailGetScanStats: () => ipcRenderer.invoke('email-get-scan-stats'),
  emailGetRecentResults: (limit) => ipcRenderer.invoke('email-get-recent-results', limit),
  emailConfigureAutoScan: (enabled, intervalHours) => ipcRenderer.invoke('email-configure-auto-scan', enabled, intervalHours),
  emailClearResults: () => ipcRenderer.invoke('email-clear-results'),
  emailRevokeAccess: () => ipcRenderer.invoke('email-revoke-access'),
  emailExportResults: (format) => ipcRenderer.invoke('email-export-results', format),

  // Email Event Listeners
  onEmailScanProgress: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('email-scan-progress');
    ipcRenderer.on('email-scan-progress', (_, data) => callback(data));
    return unsubscribe;
  },

  onEmailScanComplete: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('email-scan-complete');
    ipcRenderer.on('email-scan-complete', (_, data) => callback(data));
    return unsubscribe;
  },

  onEmailAuthStatusChanged: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('email-auth-status-changed');
    ipcRenderer.on('email-auth-status-changed', (_, status) => callback(status));
    return unsubscribe;
  },
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