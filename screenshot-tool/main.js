const { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, dialog, shell, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Import only OCR function - no AI dependencies
const { extractTextFromImage } = require('./services/aiService');

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

// Enhanced toolbar window with dashboard integration
function createToolbarWindow() {
  const savedPosition = store.get('toolbarPosition', { x: 100, y: 100 });
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  const toolbarWidth = 400;
  const toolbarHeight = 65;
  const padding = 10;
  
  const x = Math.max(padding, Math.min(savedPosition.x, width - toolbarWidth - padding));
  const y = Math.max(padding, Math.min(savedPosition.y, height - toolbarHeight - padding));

  toolbarWindow = new BrowserWindow({
    width: toolbarWidth,
    height: toolbarHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    resizable: true, // Allow programmatic resizing for dashboard
    alwaysOnTop: true,
    skipTaskbar: true,
    opacity: 0.85,
    vibrancy: 'ultra-dark',
    backgroundMaterial: 'acrylic',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    }
  });

  toolbarWindow.loadFile('toolbar.html');
  
  toolbarWindow.on('closed', () => {
    toolbarWindow = null;
    isToolbarVisible = false;
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

// Register comprehensive global shortcuts
function registerGlobalShortcuts() {
  try {
    // Core capture shortcuts
    globalShortcut.register('CmdOrCtrl+Shift+C', () => {
      triggerCapture();
    });
    
    globalShortcut.register('CmdOrCtrl+Shift+A', () => {
      triggerAnalyze();
    });
    
    // Dashboard and navigation shortcuts
    globalShortcut.register('CmdOrCtrl+Shift+D', () => {
      showDashboard();
    });
    
    globalShortcut.register('CmdOrCtrl+Shift+T', () => {
      createTrackerWindow();
    });
    
    // Quick actions
    globalShortcut.register('CmdOrCtrl+Shift+H', () => {
      toggleToolbarVisibility();
    });
    
    globalShortcut.register('CmdOrCtrl+Shift+R', () => {
      refreshAllWindows();
    });
    
    // Alternative shortcuts for accessibility
    globalShortcut.register('F1', () => {
      triggerCapture();
    });
    
    globalShortcut.register('F2', () => {
      triggerAnalyze();
    });
    
    globalShortcut.register('F3', () => {
      showDashboard();
    });
    
    console.log('Global shortcuts registered successfully');
  } catch (error) {
    console.error('Error registering global shortcuts:', error);
  }
}

// Helper functions for shortcuts
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

function showDashboard() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
}

function toggleToolbarVisibility() {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    if (toolbarWindow.isVisible()) {
      toolbarWindow.hide();
    } else {
      toolbarWindow.show();
      toolbarWindow.focus();
    }
  }
}

function refreshAllWindows() {
  // Refresh all open windows
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.reload();
    }
  });
}

// Show a notification
function showNotification(title, body) {
  try {
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
    screenshots.unshift(screenshot);
    
    // Keep only the latest 100 screenshots
    if (screenshots.length > 100) {
      screenshots.length = 100;
    }
    
    screenshotStore.set('screenshots', screenshots);
    
    // Notify the main window and toolbar if they exist
    if (mainWindow) {
      mainWindow.webContents.send('screenshot-added', screenshot);
    }
    if (toolbarWindow) {
      toolbarWindow.webContents.send('screenshot-added', screenshot);
    }
    
    showNotification('Success', `Screenshot saved to ${filePath}`);
    
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
    // Show initial processing dialog
    const progressDialog = dialog.showMessageBox({
      type: 'info',
      title: 'Ultimate Tesseract OCR',
      message: 'Extracting text with advanced OCR processing...\n\nThis may take a moment for maximum accuracy.',
      buttons: []
    });
    
    console.log('🚀 Starting Ultimate Tesseract OCR...');
    const startTime = Date.now();
    
    // Extract text using Ultimate Tesseract OCR system
    const ocrResult = await extractTextFromImage(screenshotPath);
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️ OCR completed in ${processingTime}ms`);
    
    // Close progress dialog and show results
    if (progressDialog) {
      dialog.showMessageBox({
        type: 'info',
        title: 'OCR Complete',
        message: `Ultimate Tesseract OCR Complete!\n\n` +
                `📊 Quality: ${ocrResult.qualityMetrics.quality.toUpperCase()}\n` +
                `🎯 Confidence: ${ocrResult.confidence}%\n` +
                `📝 Words extracted: ${ocrResult.wordCount}\n` +
                `⚡ Processing time: ${processingTime}ms\n` +
                `🔧 Best method: ${ocrResult.qualityMetrics.bestMethod}\n\n` +
                `Now extracting job information...`,
        buttons: ['OK']
      });
    }
    
    if (!ocrResult.text || ocrResult.text.trim() === '') {
      showNotification('OCR Error', 'No text could be extracted from the image');
      return null;
    }
    
    // Show detailed OCR quality report in console
    console.log('📊 Ultimate OCR Quality Report:');
    console.log(`   Text length: ${ocrResult.characterCount} characters`);
    console.log(`   Word count: ${ocrResult.wordCount} words`);
    console.log(`   Confidence: ${ocrResult.confidence}%`);
    console.log(`   Quality: ${ocrResult.qualityMetrics.quality}`);
    console.log(`   Best method: ${ocrResult.qualityMetrics.bestMethod}`);
    console.log(`   Processing passes: ${ocrResult.qualityMetrics.passesUsed}`);
    console.log(`   Consistency: ${ocrResult.qualityMetrics.consistency}`);
    
    // Extract job information using advanced pattern matching
    console.log('🔍 Extracting job information with pattern matching...');
    const jobData = extractJobInformationFromText(ocrResult.text);
    jobData.screenshotPath = screenshotPath;
    jobData.ocrMetadata = ocrResult.metadata;
    jobData.ocrQuality = ocrResult.qualityMetrics;
    jobData.extractedText = ocrResult.text; // Include full extracted text
    
    // Show final results
    console.log('✅ Job information extraction complete!');
    console.log(`   Company: ${jobData.company}`);
    console.log(`   Job Title: ${jobData.jobTitle}`);
    console.log(`   Location: ${jobData.location}`);
    console.log(`   Skills found: ${jobData.skills.length}`);
    
    createJobInfoWindow(jobData);
    
    return jobData;
    
  } catch (error) {
    console.error('❌ Job processing failed:', error);
    showNotification('Processing Error', `Failed to process screenshot: ${error.message}`);
    return null;
  }
}

// Add internship to tracker
function addInternshipToTracker(internshipData) {
  try {
    if (!internshipData.id) {
      internshipData.id = Date.now().toString();
    }
    
    if (!internshipData.status) {
      internshipData.status = 'interested';
    }
    
    internshipData.addedAt = new Date().toISOString();
    
    const internships = internshipStore.get('internships') || [];
    
    const existingIndex = internships.findIndex(
      i => i.companyName === internshipData.companyName && 
           i.jobTitle === internshipData.jobTitle
    );
    
    if (existingIndex >= 0) {
      internships[existingIndex] = {
        ...internships[existingIndex],
        ...internshipData,
        updatedAt: new Date().toISOString()
      };
      
      showNotification('Updated', `Updated internship at ${internshipData.companyName}`);
    } else {
      internships.unshift(internshipData);
      showNotification('Added', `Added new internship at ${internshipData.companyName}`);
    }
    
    internshipStore.set('internships', internships);
    
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

// Advanced pattern matching for job information extraction
function extractJobInformationFromText(text) {
  console.log('🔍 Starting advanced pattern matching...');
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const cleanText = text.toLowerCase();
  
  // Advanced keyword dictionaries
  const jobTitlePatterns = [
    /\b(software engineer|software developer|frontend developer|backend developer|full[- ]?stack developer)\b/gi,
    /\b(data scientist|data analyst|machine learning engineer|ai engineer)\b/gi,
    /\b(product manager|project manager|program manager)\b/gi,
    /\b(ux designer|ui designer|product designer|graphic designer)\b/gi,
    /\b(devops engineer|site reliability engineer|cloud engineer)\b/gi,
    /\b(qa engineer|test engineer|quality assurance)\b/gi,
    /\b(intern|internship|summer intern|co-op)\b/gi,
    /\b(junior|senior|lead|principal|staff|director)\s+(engineer|developer|designer|analyst)\b/gi
  ];
  
  const companyPatterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corp|Corporation|LLC|Ltd|Technologies|Tech|Labs|Systems|Solutions|Group)\b/g,
    /^([A-Z][a-zA-Z\s&]+)(?:\s+is\s+hiring|\s+careers|\s+jobs)/gm,
    /(?:Company|Organization|Employer):\s*([A-Z][a-zA-Z\s&]+)/gi,
    /(?:at|@)\s+([A-Z][a-zA-Z\s&]+)(?:\s|$)/g
  ];
  
  const locationPatterns = [
    /\b(Remote|Hybrid|On-site)\b/gi,
    /\b([A-Z][a-z]+,\s*[A-Z]{2})\b/g, // City, State
    /\b([A-Z][a-z]+,\s*[A-Z][a-z]+)\b/g, // City, Country
    /\b(San Francisco|New York|Seattle|Austin|Boston|Chicago|Los Angeles|Denver|Portland|Miami)\b/gi,
    /\b(California|New York|Washington|Texas|Massachusetts|Illinois|Colorado|Oregon|Florida)\b/gi,
    /\b(United States|USA|Canada|United Kingdom|UK|Germany|Netherlands|Australia)\b/gi
  ];
  
  const salaryPatterns = [
    /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|\/)\s*(?:year|hour|month))?/gi,
    /[\d,]+k(?:\s*-\s*[\d,]+k)?\s*(?:per\s*year|annually)?/gi,
    /(?:salary|compensation|pay):\s*\$?[\d,]+(?:\s*-\s*\$?[\d,]+)?/gi,
    /\b(unpaid|volunteer|academic credit|stipend)\b/gi
  ];
  
  const skillPatterns = [
    // Programming languages
    /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|Swift|Kotlin|PHP|Ruby|Scala|R)\b/gi,
    // Frameworks and libraries
    /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|Laravel|Rails|jQuery)\b/gi,
    // Databases
    /\b(MySQL|PostgreSQL|MongoDB|Redis|SQLite|Oracle|SQL Server|DynamoDB|Cassandra)\b/gi,
    // Cloud and DevOps
    /\b(AWS|Azure|GCP|Google Cloud|Docker|Kubernetes|Jenkins|GitLab|CircleCI|Terraform)\b/gi,
    // Tools and platforms
    /\b(Git|GitHub|GitLab|Jira|Confluence|Slack|Figma|Adobe|Photoshop|Sketch)\b/gi,
    // Other technical skills
    /\b(API|REST|GraphQL|JSON|XML|HTML|CSS|SASS|SCSS|Webpack|Babel|npm|yarn)\b/gi
  ];
  
  const requirementPatterns = [
    /\b(?:bachelor|master|phd|degree)\s+(?:in|of)\s+([a-zA-Z\s]+)/gi,
    /\b(\d+)\s*\+?\s*years?\s+(?:of\s+)?experience/gi,
    /\brequired:\s*([^.]+)/gi,
    /\bpreferred:\s*([^.]+)/gi,
    /\bmust\s+have:\s*([^.]+)/gi,
    /\bnice\s+to\s+have:\s*([^.]+)/gi
  ];
  
  // Extract information using patterns
  const extractedInfo = {
    company: extractCompany(text, lines, companyPatterns),
    jobTitle: extractJobTitle(text, lines, jobTitlePatterns),
    location: extractLocation(text, locationPatterns),
    salary: extractSalary(text, salaryPatterns),
    jobType: determineJobType(cleanText),
    workArrangement: determineWorkArrangement(text, locationPatterns),
    skills: extractSkills(text, skillPatterns),
    requirements: extractRequirements(text, requirementPatterns),
    description: generateDescription(text, lines),
    benefits: extractBenefits(cleanText),
    applicationInfo: extractApplicationInfo(text),
    department: determineDepartment(cleanText),
    seniority: determineSeniority(cleanText)
  };
  
  console.log('✅ Pattern matching extraction complete');
  return extractedInfo;
}

// Helper functions for pattern matching
function extractCompany(text, lines, patterns) {
  // Try different strategies to find company name
  
  // Strategy 1: Look for common company patterns
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const company = matches[0][1].trim();
      if (company.length > 2 && company.length < 50) {
        return company;
      }
    }
  }
  
  // Strategy 2: Look in first few lines for company name
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.match(/^[A-Z][a-zA-Z\s&]{2,30}$/) && !line.match(/\b(job|position|role|career|apply|hiring)\b/i)) {
      return line;
    }
  }
  
  // Strategy 3: Look for domain names
  const domainMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+)\.com/);
  if (domainMatch) {
    const domain = domainMatch[1];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  
  return 'Company not specified';
}

function extractJobTitle(text, lines, patterns) {
  // Look for job title patterns
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      return matches[0][0].trim();
    }
  }
  
  // Look in first few lines for job title
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];
    if (line.match(/\b(engineer|developer|designer|analyst|manager|intern)\b/i)) {
      return line;
    }
  }
  
  return 'Position not specified';
}

function extractLocation(text, patterns) {
  const locations = [];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    locations.push(...matches.map(m => m[0] || m[1]).filter(Boolean));
  }
  
  // Remove duplicates and return best match
  const uniqueLocations = [...new Set(locations)];
  return uniqueLocations.length > 0 ? uniqueLocations[0] : 'Location not specified';
}

function extractSalary(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return 'Salary not specified';
}

function extractSkills(text, patterns) {
  const skills = new Set();
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => skills.add(match[0]));
  }
  
  return Array.from(skills).slice(0, 20); // Limit to 20 skills
}

function extractRequirements(text, patterns) {
  const requirements = [];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    requirements.push(...matches.map(m => m[0] || m[1]).filter(Boolean));
  }
  
  return requirements.slice(0, 10); // Limit to 10 requirements
}

function determineJobType(cleanText) {
  if (cleanText.includes('intern')) return 'Internship';
  if (cleanText.includes('full-time') || cleanText.includes('fulltime')) return 'Full-time';
  if (cleanText.includes('part-time') || cleanText.includes('parttime')) return 'Part-time';
  if (cleanText.includes('contract')) return 'Contract';
  if (cleanText.includes('temporary')) return 'Temporary';
  return 'Not specified';
}

function determineWorkArrangement(text, locationPatterns) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('remote')) return 'Remote';
  if (lowerText.includes('hybrid')) return 'Hybrid';
  if (lowerText.includes('on-site') || lowerText.includes('onsite')) return 'On-site';
  return 'Not specified';
}

function generateDescription(text, lines) {
  // Find the longest meaningful paragraph
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
  if (paragraphs.length > 0) {
    return paragraphs[0].substring(0, 500) + (paragraphs[0].length > 500 ? '...' : '');
  }
  
  // Fallback to first few lines
  return lines.slice(0, 3).join(' ').substring(0, 300) + '...';
}

function extractBenefits(cleanText) {
  const benefits = [];
  const benefitKeywords = [
    'health insurance', 'dental', 'vision', 'medical',
    'vacation', 'pto', 'paid time off', 'holidays',
    '401k', 'retirement', 'pension',
    'stock options', 'equity', 'bonus',
    'remote work', 'flexible hours', 'work from home',
    'learning', 'training', 'education', 'tuition',
    'gym', 'fitness', 'wellness'
  ];
  
  benefitKeywords.forEach(keyword => {
    if (cleanText.includes(keyword)) {
      benefits.push(keyword);
    }
  });
  
  return benefits;
}

function extractApplicationInfo(text) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  const deadlineMatch = text.match(/(?:deadline|apply by|due):\s*([^.\n]+)/i);
  
  return {
    contact: emailMatch ? emailMatch[0] : 'Not specified',
    applyUrl: urlMatch ? urlMatch[0] : 'Not specified',
    deadline: deadlineMatch ? deadlineMatch[1].trim() : 'Not specified',
    process: 'Not specified'
  };
}

function determineDepartment(cleanText) {
  if (cleanText.includes('engineering') || cleanText.includes('software') || cleanText.includes('developer')) return 'Engineering';
  if (cleanText.includes('product')) return 'Product';
  if (cleanText.includes('design') || cleanText.includes('ux') || cleanText.includes('ui')) return 'Design';
  if (cleanText.includes('data') || cleanText.includes('analytics')) return 'Data';
  if (cleanText.includes('marketing')) return 'Marketing';
  if (cleanText.includes('sales')) return 'Sales';
  if (cleanText.includes('hr') || cleanText.includes('human resources')) return 'HR';
  return 'Not specified';
}

function determineSeniority(cleanText) {
  if (cleanText.includes('intern')) return 'Internship';
  if (cleanText.includes('junior') || cleanText.includes('entry')) return 'Entry-level';
  if (cleanText.includes('senior') || cleanText.includes('sr.')) return 'Senior';
  if (cleanText.includes('lead') || cleanText.includes('principal')) return 'Lead';
  if (cleanText.includes('director') || cleanText.includes('vp')) return 'Director';
  return 'Mid-level';
}

// App lifecycle events
app.whenReady().then(() => {
  createToolbarWindow();
  createTray();
  startContextDetection();
  
  // Register comprehensive global shortcuts
  registerGlobalShortcuts();

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

// Add missing IPC handlers for new dashboard functionality
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await shell.openPath(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
});

ipcMain.handle('clear-screenshots', async () => {
  try {
    const screenshots = screenshotStore.get('screenshots') || [];
    
    // Delete all screenshot files
    for (const screenshot of screenshots) {
      try {
        if (fs.existsSync(screenshot.path)) {
          fs.unlinkSync(screenshot.path);
        }
        if (fs.existsSync(screenshot.thumbnailPath)) {
          fs.unlinkSync(screenshot.thumbnailPath);
        }
      } catch (err) {
        console.error('Error deleting screenshot file:', err);
      }
    }
    
    // Clear the database
    screenshotStore.set('screenshots', []);
    
    // Notify main window if it exists
    if (mainWindow) {
      mainWindow.webContents.send('screenshots-cleared');
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing screenshots:', error);
    throw error;
  }
});

// Enhanced window management IPC handlers
ipcMain.handle('move-window', (event, x, y) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window && !window.isDestroyed()) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    const [currentWidth, currentHeight] = window.getSize();
    const padding = 10;
    
    const validX = Math.max(padding, Math.min(x, width - currentWidth - padding));
    const validY = Math.max(padding, Math.min(y, height - currentHeight - padding));
    
    window.setPosition(validX, validY);
    return { x: validX, y: validY };
  }
  return null;
});

ipcMain.handle('get-window-position', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window && !window.isDestroyed()) {
    const [x, y] = window.getPosition();
    return { x, y };
  }
  return { x: 0, y: 0 };
});

ipcMain.handle('resize-window', (event, width, height) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window && !window.isDestroyed()) {
    const [x, y] = window.getPosition();
    
    const minWidth = 400;
    const maxWidth = 800;
    const minHeight = 65;
    const maxHeight = 500;
    
    const validWidth = Math.max(minWidth, Math.min(width, maxWidth));
    const validHeight = Math.max(minHeight, Math.min(height, maxHeight));
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    const adjustedX = Math.max(0, Math.min(x, screenWidth - validWidth));
    const adjustedY = Math.max(0, Math.min(y, screenHeight - validHeight));
    
    window.setBounds({
      x: adjustedX,
      y: adjustedY,
      width: validWidth,
      height: validHeight
    });
    
    return { width: validWidth, height: validHeight };
  }
  return null;
});

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
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  const toolbarWidth = 400;
  const toolbarHeight = 65;
  const padding = 10;
  
  const validX = Math.max(padding, Math.min(x, width - toolbarWidth - padding));
  const validY = Math.max(padding, Math.min(y, height - toolbarHeight - padding));
  
  store.set('toolbarPosition', { x: validX, y: validY });
  
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window && !window.isDestroyed()) {
    const [currentX, currentY] = window.getPosition();
    if (Math.abs(currentX - validX) > 5 || Math.abs(currentY - validY) > 5) {
      window.setPosition(validX, validY);
    }
  }
  
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
  globalShortcut.unregisterAll();
  
  if (contextDetectionInterval) {
    clearInterval(contextDetectionInterval);
  }
  
  if (toolbarFadeTimeout) {
    clearTimeout(toolbarFadeTimeout);
  }
});