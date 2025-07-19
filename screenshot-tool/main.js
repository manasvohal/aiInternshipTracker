const { app, BrowserWindow, ipcMain, desktopCapturer, Menu, Tray, shell, dialog, nativeImage, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { extractTextFromImage, extractJobInformation } = require('./services/aiService');

// Initialize store for settings and screenshot database
const store = new Store();
const screenshotStore = new Store({ name: 'screenshots' });
const internshipStore = new Store({ name: 'internships' });

// Keep references to prevent garbage collection
let mainWindow = null;
let toolbarWindow = null;
let tray = null;
let jobInfoWindow = null;
let trackerWindow = null;

// Enhanced state management
let toolbarFadeTimeout = null;
let isToolbarVisible = true;
let lastActiveWindow = null;
let contextDetectionInterval = null;

// Set default settings if not already set
if (!store.get('saveDirectory')) {
  store.set('saveDirectory', app.getPath('pictures'));
}

// Initialize toolbar position
if (!store.get('toolbarPosition')) {
  store.set('toolbarPosition', { x: 100, y: 100 });
}

// Initialize screenshot database if not exists
if (!screenshotStore.get('screenshots')) {
  screenshotStore.set('screenshots', []);
}

// Initialize internship database if not exists
if (!internshipStore.get('internships')) {
  internshipStore.set('internships', []);
}

// Create the main application window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    backgroundMaterial: 'acrylic'
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create the job info window
function createJobInfoWindow(jobData) {
  if (jobInfoWindow) {
    jobInfoWindow.close();
  }

  jobInfoWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window'
  });

  jobInfoWindow.loadFile('job-info.html');
  
  jobInfoWindow.webContents.on('did-finish-load', () => {
    jobInfoWindow.webContents.send('job-data', jobData);
    jobInfoWindow.show();
  });
  
  jobInfoWindow.on('closed', () => {
    jobInfoWindow = null;
  });
}

// Create the internship tracker window
function createTrackerWindow() {
  if (trackerWindow) {
    trackerWindow.show();
    return;
  }

  trackerWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window'
  });

  trackerWindow.loadFile('tracker.html');
  
  trackerWindow.webContents.on('did-finish-load', () => {
    trackerWindow.show();
  });
  
  trackerWindow.on('closed', () => {
    trackerWindow = null;
  });
}

// Enhanced toolbar window with Cluely-inspired features
function createToolbarWindow() {
  const savedPosition = store.get('toolbarPosition');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Smart positioning - keep within screen bounds
  const x = Math.max(0, Math.min(savedPosition.x, width - 400));
  const y = Math.max(0, Math.min(savedPosition.y, height - 80));

  toolbarWindow = new BrowserWindow({
    width: 400,
    height: 65,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    opacity: 0.85,
    vibrancy: 'ultra-dark', // macOS
    backgroundMaterial: 'acrylic', // Windows 11
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    }
  });

  toolbarWindow.loadFile('toolbar.html');
  
  // Enhanced auto-fade behavior
  setupToolbarAutoFade();
  
  // Smart edge snapping
  setupEdgeSnapping();
  
  toolbarWindow.on('closed', () => {
    toolbarWindow = null;
    isToolbarVisible = false;
  });

  toolbarWindow.on('moved', () => {
    const [x, y] = toolbarWindow.getPosition();
    store.set('toolbarPosition', { x, y });
  });
}

// Setup auto-fade behavior for toolbar
function setupToolbarAutoFade() {
  if (!toolbarWindow) return;
  
  let fadeTimeout;
  
  const startFadeTimer = () => {
    clearTimeout(fadeTimeout);
    fadeTimeout = setTimeout(() => {
      if (toolbarWindow && !toolbarWindow.isDestroyed()) {
        toolbarWindow.setOpacity(0.6);
      }
    }, 3000);
  };
  
  const cancelFadeTimer = () => {
    clearTimeout(fadeTimeout);
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.setOpacity(0.95);
    }
  };
  
  toolbarWindow.on('blur', startFadeTimer);
  toolbarWindow.on('focus', cancelFadeTimer);
  
  // Start initial timer
  startFadeTimer();
}

// Setup edge snapping for toolbar
function setupEdgeSnapping() {
  if (!toolbarWindow) return;
  
  let snapThreshold = 20;
  
  toolbarWindow.on('moved', () => {
    const [x, y] = toolbarWindow.getPosition();
    const bounds = screen.getPrimaryDisplay().workAreaSize;
    let newX = x;
    let newY = y;
    
    // Snap to edges
    if (x < snapThreshold) newX = 0;
    if (y < snapThreshold) newY = 0;
    if (x > bounds.width - 400 - snapThreshold) newX = bounds.width - 400;
    if (y > bounds.height - 65 - snapThreshold) newY = bounds.height - 65;
    
    if (newX !== x || newY !== y) {
      toolbarWindow.setPosition(newX, newY);
    }
  });
}

// Enhanced tray with better icons and menu
function createTray() {
  try {
    // Create a better tray icon
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Show Toolbar', 
        click: () => {
          if (toolbarWindow) {
            toolbarWindow.show();
            toolbarWindow.setOpacity(0.95);
            isToolbarVisible = true;
          } else {
            createToolbarWindow();
          }
        } 
      },
      { 
        label: 'Quick Capture',
        accelerator: 'CmdOrCtrl+Shift+C',
        click: () => {
          triggerCapture();
        }
      },
      { 
        label: 'Quick Analyze',
        accelerator: 'CmdOrCtrl+Shift+A', 
        click: () => {
          triggerAnalyze();
        }
      },
      { type: 'separator' },
      { 
        label: 'Dashboard', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
          } else {
            createMainWindow();
            mainWindow.once('ready-to-show', () => {
              mainWindow.show();
            });
          }
        } 
      },
      { 
        label: 'Internship Tracker', 
        click: () => {
          createTrackerWindow();
        } 
      },
      { type: 'separator' },
      { 
        label: 'Settings',
        click: () => {
          // TODO: Implement settings window
          dialog.showMessageBox({
            type: 'info',
            title: 'Settings',
            message: 'Settings panel coming soon!',
            buttons: ['OK']
          });
        }
      },
      { 
        label: 'Exit', 
        click: () => {
          app.quit();
        } 
      }
    ]);
    
    tray.setToolTip('AI Internship Tracker');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (toolbarWindow) {
        if (isToolbarVisible) {
          toolbarWindow.hide();
          isToolbarVisible = false;
        } else {
          toolbarWindow.show();
          toolbarWindow.setOpacity(0.95);
          isToolbarVisible = true;
        }
      } else {
        createToolbarWindow();
      }
    });
  } catch (error) {
    console.error('Error creating tray:', error);
  }
}

// Context detection for job sites
function startContextDetection() {
  contextDetectionInterval = setInterval(async () => {
    try {
      // Get all open windows and detect job sites
      const windows = BrowserWindow.getAllWindows();
      for (const window of windows) {
        if (window.webContents) {
          const url = window.webContents.getURL();
          const title = window.webContents.getTitle();
          
          if (isJobSite(url, title)) {
            if (toolbarWindow && !toolbarWindow.isDestroyed()) {
              toolbarWindow.webContents.send('context-changed', {
                isJobSite: true,
                site: detectJobSite(url),
                url: url,
                title: title
              });
            }
            break;
          }
        }
      }
    } catch (error) {
      // Silently handle errors
    }
  }, 5000);
}

// Helper function to detect job sites
function isJobSite(url, title) {
  const jobSites = [
    'linkedin.com/jobs',
    'indeed.com',
    'glassdoor.com',
    'monster.com',
    'ziprecruiter.com',
    'simplyhired.com',
    'careerbuilder.com'
  ];
  
  const jobKeywords = ['job', 'career', 'position', 'hiring', 'employment'];
  
  return jobSites.some(site => url.includes(site)) || 
         jobKeywords.some(keyword => title.toLowerCase().includes(keyword));
}

function detectJobSite(url) {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('indeed.com')) return 'indeed';
  if (url.includes('glassdoor.com')) return 'glassdoor';
  return 'other';
}

// Global shortcut handlers
function triggerCapture() {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send('trigger-capture');
  }
}

function triggerAnalyze() {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send('trigger-analyze');
  }
}

// Show a notification
function showNotification(title, body) {
  try {
    // Show dialog instead of notification for simplicity
    dialog.showMessageBox({
      type: 'info',
      title: title,
      message: body,
      buttons: ['OK']
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Capture screenshot
async function captureScreenshot() {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
    return sources;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    showNotification('Error', 'Failed to capture screenshot');
    throw error;
  }
}

// Save screenshot to file
async function saveScreenshot(dataURL) {
  try {
    const saveDir = store.get('saveDirectory');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filePath = path.join(saveDir, `screenshot-${timestamp}.png`);
    
    // Convert data URL to buffer
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save file
    fs.writeFileSync(filePath, buffer);
    
    // Create thumbnail for database
    const thumbnailSize = 200;
    const thumbnailPath = path.join(saveDir, `screenshot-${timestamp}-thumb.png`);
    
    // Save the screenshot to database
    const screenshot = {
      id: Date.now().toString(),
      path: filePath,
      thumbnailPath: thumbnailPath,
      timestamp: new Date().toISOString(),
      name: `Screenshot ${new Date().toLocaleString()}`
    };
    
    // Save thumbnail
    fs.writeFileSync(thumbnailPath, buffer);
    
    // Add to database
    const screenshots = screenshotStore.get('screenshots') || [];
    screenshots.unshift(screenshot); // Add to beginning of array
    
    // Keep only the latest 100 screenshots
    if (screenshots.length > 100) {
      screenshots.length = 100;
    }
    
    screenshotStore.set('screenshots', screenshots);
    
    // Notify the main window if it exists
    if (mainWindow) {
      mainWindow.webContents.send('screenshot-added', screenshot);
    }
    
    showNotification('Success', `Screenshot saved to ${filePath}`);
    
    // Open the file
    shell.openPath(filePath);
    
    return filePath;
  } catch (error) {
    console.error('Error saving screenshot:', error);
    showNotification('Error', 'Failed to save screenshot');
    throw error;
  }
}

// Process job information from screenshot
async function processJobInfo(screenshotPath) {
  try {
    // Show loading dialog
    dialog.showMessageBox({
      type: 'info',
      title: 'Processing',
      message: 'Extracting text and analyzing job information...',
      buttons: []
    });
    
    // Extract text from image
    const extractedText = await extractTextFromImage(screenshotPath);
    
    if (!extractedText || extractedText.trim() === '') {
      showNotification('Error', 'No text could be extracted from the image');
      return null;
    }
    
    // Extract job information from text
    const jobData = await extractJobInformation(extractedText);
    
    // Add screenshot path to job data
    jobData.screenshotPath = screenshotPath;
    
    // Show job information window
    createJobInfoWindow(jobData);
    
    return jobData;
  } catch (error) {
    console.error('Error processing job information:', error);
    showNotification('Error', 'Failed to process job information');
    return null;
  }
}

// Add internship to tracker
function addInternshipToTracker(internshipData) {
  try {
    // Generate unique ID if not exists
    if (!internshipData.id) {
      internshipData.id = Date.now().toString();
    }
    
    // Set default status if not provided
    if (!internshipData.status) {
      internshipData.status = 'interested';
    }
    
    // Add timestamp
    internshipData.addedAt = new Date().toISOString();
    
    // Get existing internships
    const internships = internshipStore.get('internships') || [];
    
    // Check if internship already exists (based on company and title)
    const existingIndex = internships.findIndex(
      i => i.companyName === internshipData.companyName && 
           i.jobTitle === internshipData.jobTitle
    );
    
    if (existingIndex >= 0) {
      // Update existing internship
      internships[existingIndex] = {
        ...internships[existingIndex],
        ...internshipData,
        updatedAt: new Date().toISOString()
      };
      
      showNotification('Updated', `Updated internship at ${internshipData.companyName}`);
    } else {
      // Add new internship
      internships.unshift(internshipData);
      showNotification('Added', `Added new internship at ${internshipData.companyName}`);
    }
    
    // Save to store
    internshipStore.set('internships', internships);
    
    // Notify tracker window if open
    if (trackerWindow) {
      trackerWindow.webContents.send('internships-updated');
    }
    
    return internshipData;
  } catch (error) {
    console.error('Error adding internship to tracker:', error);
    showNotification('Error', 'Failed to add internship to tracker');
    return null;
  }
}

// App lifecycle events
app.whenReady().then(() => {
  createToolbarWindow();
  createTray();
  startContextDetection(); // Start context detection
  
  // Register global shortcuts
  globalShortcut.register('CmdOrCtrl+Shift+C', () => {
    triggerCapture();
  });
  globalShortcut.register('CmdOrCtrl+Shift+A', () => {
    triggerAnalyze();
  });

  // Mac-specific behavior
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createToolbarWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('capture-screenshot', async () => {
  try {
    return await captureScreenshot();
  } catch (error) {
    console.error('Error in capture-screenshot handler:', error);
    throw error;
  }
});

ipcMain.on('toolbar-drag', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.moveTop();
    win.startMoving();
  }
});

ipcMain.handle('save-screenshot', async (event, dataURL) => {
  try {
    return await saveScreenshot(dataURL);
  } catch (error) {
    console.error('Error in save-screenshot handler:', error);
    throw error;
  }
});

ipcMain.handle('process-job-info', async (event, screenshotPath) => {
  try {
    return await processJobInfo(screenshotPath);
  } catch (error) {
    console.error('Error in process-job-info handler:', error);
    throw error;
  }
});

ipcMain.handle('show-dashboard', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createMainWindow();
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });
  }
});

ipcMain.handle('show-tracker', () => {
  createTrackerWindow();
});

ipcMain.handle('get-settings', () => {
  return {
    saveDirectory: store.get('saveDirectory')
  };
});

ipcMain.handle('get-screenshots', () => {
  return screenshotStore.get('screenshots') || [];
});

ipcMain.handle('get-internships', () => {
  return internshipStore.get('internships') || [];
});

ipcMain.handle('add-internship', (event, internshipData) => {
  return addInternshipToTracker(internshipData);
});

ipcMain.handle('update-internship', (event, id, updates) => {
  const internships = internshipStore.get('internships') || [];
  const index = internships.findIndex(i => i.id === id);
  
  if (index >= 0) {
    internships[index] = {
      ...internships[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    internshipStore.set('internships', internships);
    
    // Notify tracker window if open
    if (trackerWindow) {
      trackerWindow.webContents.send('internships-updated');
    }
    
    return internships[index];
  }
  
  return null;
});

ipcMain.handle('delete-internship', (event, id) => {
  const internships = internshipStore.get('internships') || [];
  const newInternships = internships.filter(i => i.id !== id);
  
  if (newInternships.length !== internships.length) {
    internshipStore.set('internships', newInternships);
    
    // Notify tracker window if open
    if (trackerWindow) {
      trackerWindow.webContents.send('internships-updated');
    }
    
    return true;
  }
  
  return false;
});

ipcMain.handle('delete-screenshot', (event, id) => {
  const screenshots = screenshotStore.get('screenshots') || [];
  const screenshot = screenshots.find(s => s.id === id);
  
  if (screenshot) {
    // Try to delete the files
    try {
      if (fs.existsSync(screenshot.path)) {
        fs.unlinkSync(screenshot.path);
      }
      if (fs.existsSync(screenshot.thumbnailPath)) {
        fs.unlinkSync(screenshot.thumbnailPath);
      }
    } catch (err) {
      console.error('Error deleting screenshot files:', err);
    }
    
    // Remove from database
    const newScreenshots = screenshots.filter(s => s.id !== id);
    screenshotStore.set('screenshots', newScreenshots);
    
    return true;
  }
  
  return false;
});

ipcMain.handle('open-screenshot', (event, id) => {
  const screenshots = screenshotStore.get('screenshots') || [];
  const screenshot = screenshots.find(s => s.id === id);
  
  if (screenshot && fs.existsSync(screenshot.path)) {
    shell.openPath(screenshot.path);
    return true;
  }
  
  return false;
});

ipcMain.handle('analyze-job-screenshot', (event, id) => {
  const screenshots = screenshotStore.get('screenshots') || [];
  const screenshot = screenshots.find(s => s.id === id);
  
  if (screenshot && fs.existsSync(screenshot.path)) {
    return processJobInfo(screenshot.path);
  }
  
  return null;
});

ipcMain.handle('set-save-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    store.set('saveDirectory', result.filePaths[0]);
    return result.filePaths[0];
  }
  
  return store.get('saveDirectory');
});

// Enhanced Cluely-inspired IPC handlers
ipcMain.handle('set-toolbar-opacity', (event, opacity) => {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.setOpacity(opacity);
    return true;
  }
  return false;
});

ipcMain.handle('get-active-window', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow && focusedWindow.webContents) {
    return {
      title: focusedWindow.webContents.getTitle(),
      url: focusedWindow.webContents.getURL()
    };
  }
  return null;
});

ipcMain.handle('hide-toolbar', () => {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.hide();
    isToolbarVisible = false;
    return true;
  }
  return false;
});

ipcMain.handle('save-toolbar-position', (event, x, y) => {
  store.set('toolbarPosition', { x, y });
  return true;
});

ipcMain.handle('detect-job-site', () => {
  try {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && focusedWindow.webContents) {
      const url = focusedWindow.webContents.getURL();
      const title = focusedWindow.webContents.getTitle();
      
      if (isJobSite(url, title)) {
        return {
          isJobSite: true,
          site: detectJobSite(url),
          url: url,
          title: title
        };
      }
    }
    return { isJobSite: false };
  } catch (error) {
    return { isJobSite: false };
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  // Unregister global shortcuts
  globalShortcut.unregisterAll();
  
  // Clear intervals
  if (contextDetectionInterval) {
    clearInterval(contextDetectionInterval);
  }
  
  if (toolbarFadeTimeout) {
    clearTimeout(toolbarFadeTimeout);
  }
}); 