// DOM Elements
const toolbar = document.getElementById('toolbar');
const captureBtn = document.getElementById('captureBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const dashboardToggle = document.getElementById('dashboardToggle');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const contextMenu = document.getElementById('contextMenu');
const hintBubble = document.getElementById('hintBubble');

// Dashboard elements
const dashboardDropdown = document.getElementById('dashboardDropdown');
const screenshotGrid = document.getElementById('screenshotGrid');
const refreshDashboard = document.getElementById('refreshDashboard');
const clearAll = document.getElementById('clearAll');

// New dashboard elements
const dashboardTabs = document.querySelectorAll('.dashboard-tab');
const addInternshipBtn = document.getElementById('addInternship');
const screenshotsTab = document.getElementById('screenshotsTab');
const internshipsTab = document.getElementById('internshipsTab');

// Internship elements
const totalInternships = document.getElementById('totalInternships');
const pendingInternships = document.getElementById('pendingInternships');
const interviewInternships = document.getElementById('interviewInternships');
const internshipList = document.getElementById('internshipList');

// State management
let currentStatus = 'ready';
let isProcessing = false;
let fadeTimeout = null;
let hintTimeout = null;
let contextDetection = null;
let isDashboardOpen = false;
let currentTab = 'screenshots';
let internshipData = [];

// Initialize toolbar
document.addEventListener('DOMContentLoaded', () => {
  initializeToolbar();
  setupEventListeners();
  startContextDetection();
  loadDashboardScreenshots();
  loadInternshipData(); // Load internship data on startup
  
  // Test dashboard functionality on load
  console.log('Dashboard elements found:', {
    dropdown: !!dashboardDropdown,
    toggle: !!dashboardToggle,
    grid: !!screenshotGrid,
    tabs: dashboardTabs.length,
    internships: !!internshipsTab,
  });
});

function initializeToolbar() {
  setStatus('ready');
  setupDragBehavior();
  setupKeyboardShortcuts();
  setupAutoFade();
}

function setupEventListeners() {
  // Button clicks
  captureBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleCapture(false);
  });
  
  analyzeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleCapture(true);
  });
  
  // Dashboard toggle - FIXED event listener
  dashboardToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Dashboard toggle clicked, current state:', isDashboardOpen);
    toggleDashboard();
  });
  
  // Dashboard tabs
  dashboardTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      switchTab(tab.dataset.tab);
    });
  });
  
  // Dashboard actions
  if (refreshDashboard) {
    refreshDashboard.addEventListener('click', (e) => {
      e.stopPropagation();
      refreshCurrentTab();
      showHint('Dashboard refreshed');
    });
  }
  
  if (addInternshipBtn) {
    addInternshipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addInternshipManually();
    });
  }
  
  if (clearAll) {
    clearAll.addEventListener('click', (e) => {
      e.stopPropagation();
      clearCurrentTabData();
    });
  }
  
  // Context menu
  toolbar.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu') && !e.target.closest('.floating-toolbar')) {
      hideContextMenu();
    }
    // Only close dashboard if clicking completely outside
    if (!e.target.closest('.dashboard-dropdown') && 
        !e.target.closest('.dashboard-toggle') && 
        !e.target.closest('.floating-toolbar')) {
      closeDashboard();
    }
  });
  
  // Context menu items
  contextMenu.addEventListener('click', handleContextMenuClick);
  
  // Hover effects for hints
  captureBtn.addEventListener('mouseenter', () => showHint('Capture screenshot'));
  analyzeBtn.addEventListener('mouseenter', () => showHint('Capture and analyze job posting'));
  dashboardToggle.addEventListener('mouseenter', () => showHint('Toggle screenshot dashboard'));
  captureBtn.addEventListener('mouseleave', hideHint);
  analyzeBtn.addEventListener('mouseleave', hideHint);
  dashboardToggle.addEventListener('mouseleave', hideHint);
  
  // Keyboard navigation
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Listen for new screenshots
  if (window.electron && window.electron.onScreenshotAdded) {
    window.electron.onScreenshotAdded((screenshot) => {
      console.log('New screenshot added:', screenshot);
      loadDashboardScreenshots();
      if (!isDashboardOpen) {
        openDashboard();
        showHint('New screenshot added!');
      }
    });
  }

  const gmailScanBtn = document.getElementById('gmailScanBtn');
  if (gmailScanBtn) {
    gmailScanBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      showHint('Scanning Gmail for internships...');
      if (window.electron && window.electron.scanGmail) {
        await window.electron.scanGmail();
      } else {
        alert('Gmail scan integration not available in this build.');
      }
    });
  }
}

function setupDragBehavior() {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let windowStartX = 0;
  let windowStartY = 0;

  toolbar.addEventListener('mousedown', (e) => {
    // Don't drag if clicking on buttons or dashboard
    if (e.target.closest('.action-btn') || 
        e.target.closest('.context-menu') || 
        e.target.closest('.hint-bubble') ||
        e.target.closest('.dashboard-dropdown')) {
      return;
    }

    isDragging = true;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    
    getCurrentWindowPosition().then(pos => {
      windowStartX = pos.x;
      windowStartY = pos.y;
    });

    toolbar.style.cursor = 'grabbing';
    e.preventDefault();
    e.stopPropagation();

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  });

  function handleDragMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const deltaX = e.screenX - dragStartX;
    const deltaY = e.screenY - dragStartY;
    const newX = windowStartX + deltaX;
    const newY = windowStartY + deltaY;

    if (window.electron && window.electron.moveWindow) {
      window.electron.moveWindow(newX, newY);
    }
  }

  function handleDragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    toolbar.style.cursor = 'move';

    const deltaX = e.screenX - dragStartX;
    const deltaY = e.screenY - dragStartY;
    const finalX = windowStartX + deltaX;
    const finalY = windowStartY + deltaY;

    if (window.electron && window.electron.saveToolbarPosition) {
      window.electron.saveToolbarPosition(finalX, finalY);
    }

    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    e.preventDefault();
    e.stopPropagation();
  }
}

async function getCurrentWindowPosition() {
  if (window.electron && window.electron.getWindowPosition) {
    return await window.electron.getWindowPosition();
  }
  return { x: 0, y: 0 };
}

async function moveWindowWithArrows(direction) {
  const currentPos = await getCurrentWindowPosition();
  const step = 10;
  
  let newX = currentPos.x;
  let newY = currentPos.y;
  
  switch (direction) {
    case 'up': newY -= step; break;
    case 'down': newY += step; break;
    case 'left': newX -= step; break;
    case 'right': newX += step; break;
  }
  
  if (window.electron && window.electron.moveWindow) {
    window.electron.moveWindow(newX, newY);
    window.electron.saveToolbarPosition(newX, newY);
  }
}

function setupAutoFade() {
  function startFadeTimer() {
    clearTimeout(fadeTimeout);
    fadeTimeout = setTimeout(() => {
      if (!isProcessing && !contextMenu.classList.contains('active') && !isDashboardOpen) {
        toolbar.style.opacity = '0.8'; // Increased minimum opacity
      }
    }, 3000);
  }
  
  function cancelFadeTimer() {
    clearTimeout(fadeTimeout);
    toolbar.style.opacity = '0.98';
  }
  
  toolbar.addEventListener('mouseenter', cancelFadeTimer);
  toolbar.addEventListener('mouseleave', startFadeTimer);
  
  startFadeTimer();
}

function setupKeyboardShortcuts() {
  if (window.electron && window.electron.onTriggerCapture) {
    window.electron.onTriggerCapture(() => handleCapture(false));
  }
  
  if (window.electron && window.electron.onTriggerAnalyze) {
    window.electron.onTriggerAnalyze(() => handleCapture(true));
  }
}

function handleKeyboardShortcuts(e) {
  // Arrow key movement
  if (e.ctrlKey || e.metaKey || document.activeElement === document.body) {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveWindowWithArrows('up');
        showHint('↑ Moving up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveWindowWithArrows('down');
        showHint('↓ Moving down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveWindowWithArrows('left');
        showHint('← Moving left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveWindowWithArrows('right');
        showHint('→ Moving right');
        break;
    }
  }
  
  // Function key shortcuts
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case '1':
        e.preventDefault();
        handleCapture(false);
        break;
      case '2':
        e.preventDefault();
        handleCapture(true);
        break;
      case '3':
        e.preventDefault();
        toggleDashboard();
        break;
      case 'h':
        e.preventDefault();
        hideToolbar();
        break;
    }
  }
  
  // Other shortcuts
  switch (e.key) {
    case 'Escape':
      hideContextMenu();
      closeDashboard();
      break;
    case 'c':
      if (!e.ctrlKey && !e.metaKey) {
        handleCapture(false);
      }
      break;
    case 'a':
      if (!e.ctrlKey && !e.metaKey) {
        handleCapture(true);
      }
      break;
    case 'd':
      if (!e.ctrlKey && !e.metaKey) {
        toggleDashboard();
      }
      break;
  }
}

async function handleCapture(shouldAnalyze = false) {
  if (isProcessing) return;
  
  try {
    setStatus('processing');
    isProcessing = true;
    
    // Close dashboard during capture
    if (isDashboardOpen) {
      closeDashboard();
    }
    
    toolbar.style.opacity = '0.3';
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const sources = await window.electron.captureScreenshot();
    
    if (!sources || sources.length === 0) {
      throw new Error('No screen sources available');
    }
    
    const primarySource = sources[0];
    if (primarySource.thumbnail) {
      const dataURL = primarySource.thumbnail.toDataURL();
      const filePath = await window.electron.saveScreenshot(dataURL);
      
      if (shouldAnalyze && filePath) {
        setStatus('analyzing');
        const jobData = await window.electron.processJobInfo(filePath);
        
        // Automatically add to internship tracker if job data was extracted
        if (jobData && jobData.company && jobData.company !== 'Unknown Company') {
          addInternshipFromJobData(jobData);
          showHint(`Job analysis complete! Added ${jobData.company} to tracker.`);
        } else {
          showHint('Job analysis complete!');
        }
      } else {
        showHint('Screenshot captured!');
        // Auto-open dashboard to show new screenshot
        setTimeout(() => {
          openDashboard();
        }, 800);
      }
    }
    
    setStatus('ready');
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    setStatus('error');
    showHint(`Error: ${error.message}`);
    setTimeout(() => setStatus('ready'), 3000);
  } finally {
    isProcessing = false;
    toolbar.style.opacity = '0.98';
  }
}

// Dashboard functionality - COMPACT DESIGN
function toggleDashboard() {
  console.log('Toggling dashboard, current state:', isDashboardOpen);
  if (isDashboardOpen) {
    closeDashboard();
  } else {
    openDashboard();
  }
}

function openDashboard() {
  console.log('Opening dashboard...');
  isDashboardOpen = true;
  
  // Add CSS classes for visual feedback
  dashboardDropdown.classList.add('open');
  toolbar.classList.add('dashboard-open');
  dashboardToggle.classList.add('active');
  
  // Force the dropdown to be visible
  dashboardDropdown.style.maxHeight = '320px'; // Compact natural height
  dashboardDropdown.style.opacity = '1';
  
  // Resize window to accommodate compact dashboard
  if (window.electron && window.electron.resizeWindow) {
    window.electron.resizeWindow(420, 390); // Compact and natural sizing
  }
  
  loadCurrentTabData();
  showHint('Dashboard opened');
  console.log('Dashboard should now be visible');
}

function closeDashboard() {
  if (!isDashboardOpen) return;
  
  console.log('Closing dashboard...');
  isDashboardOpen = false;
  
  // Remove CSS classes
  dashboardDropdown.classList.remove('open');
  toolbar.classList.remove('dashboard-open');
  dashboardToggle.classList.remove('active');
  
  // Force the dropdown to be hidden
  dashboardDropdown.style.maxHeight = '0';
  dashboardDropdown.style.opacity = '0';
  
  // Resize window back to compact toolbar size
  if (window.electron && window.electron.resizeWindow) {
    window.electron.resizeWindow(400, 57); // Compact toolbar height
  }
}

// Tab Management
function switchTab(tabName) {
  // Update tab active state
  dashboardTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update content visibility
  screenshotsTab.classList.toggle('hidden', tabName !== 'screenshots');
  internshipsTab.classList.toggle('hidden', tabName !== 'internships');
  
  // Update action buttons
  addInternshipBtn.style.display = tabName === 'internships' ? 'block' : 'none';
  
  currentTab = tabName;
  loadCurrentTabData();
  showHint(`Switched to ${tabName}`);
}

function refreshCurrentTab() {
  loadCurrentTabData();
}

function loadCurrentTabData() {
  switch (currentTab) {
    case 'screenshots':
      loadDashboardScreenshots();
      break;
    case 'internships':
      loadInternshipData();
      break;
  }
}

function clearCurrentTabData() {
  switch (currentTab) {
    case 'screenshots':
      clearAllScreenshots();
      break;
    case 'internships':
      clearAllInternships();
      break;
  }
}

// Internship Management
async function loadInternshipData() {
  try {
    console.log('Loading internship data...');
    
    // Load from localStorage or electron store
    const storedData = localStorage.getItem('internshipData');
    if (storedData) {
      internshipData = JSON.parse(storedData);
    }
    
    // Also try to get from electron if available
    if (window.electron && window.electron.getInternships) {
      const electronData = await window.electron.getInternships();
      if (electronData && electronData.length > 0) {
        internshipData = electronData;
      }
    }
    
    updateInternshipStats();
    renderInternshipList();
    
  } catch (error) {
    console.error('Error loading internship data:', error);
    showHint('Error loading internships');
  }
}

function updateInternshipStats() {
  const total = internshipData.length;
  const pending = internshipData.filter(i => i.status === 'applied' || i.status === 'pending').length;
  const interviews = internshipData.filter(i => i.status === 'interview').length;
  
  totalInternships.textContent = total;
  pendingInternships.textContent = pending;
  interviewInternships.textContent = interviews;
}

function renderInternshipList() {
  if (internshipData.length === 0) {
    internshipList.innerHTML = `
      <div class="empty-state">
        <p>No internships tracked yet.<br>Analyze a job posting to get started!</p>
      </div>
    `;
    return;
  }
  
  // Sort by date (newest first)
  const sortedInternships = [...internshipData].sort((a, b) => 
    new Date(b.dateAdded || b.timestamp) - new Date(a.dateAdded || a.timestamp)
  );
  
  internshipList.innerHTML = sortedInternships.map(internship => `
    <div class="internship-item" data-id="${internship.id}">
      <div class="internship-info">
        <div class="company-name">${internship.company || 'Unknown Company'}</div>
        <div class="job-details">
          ${internship.jobTitle || 'Position'} • ${formatDate(internship.dateAdded)}
        </div>
      </div>
      <div class="status ${internship.status || 'applied'}">${(internship.status || 'applied').toUpperCase()}</div>
    </div>
  `).join('');
  
  // Add click handlers
  internshipList.querySelectorAll('.internship-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      editInternship(item.dataset.id);
    });
  });
}

function addInternshipFromJobData(jobData) {
  const internship = {
    id: generateId(),
    company: jobData.company || 'Unknown Company',
    jobTitle: jobData.jobTitle || 'Position',
    location: jobData.location || 'Not specified',
    salary: jobData.salary || 'Not specified',
    status: 'applied',
    dateAdded: new Date().toISOString(),
    applicationDeadline: jobData.applicationInfo?.deadline || null,
    jobData: jobData // Store full job data
  };
  
  internshipData.push(internship);
  saveInternshipData();
  
  if (currentTab === 'internships') {
    updateInternshipStats();
    renderInternshipList();
  }
  
  showHint(`Added ${internship.company} to tracking!`);
}

function addInternshipManually() {
  const company = prompt('Company name:');
  if (!company) return;
  
  const jobTitle = prompt('Job title:') || 'Position';
  const status = prompt('Status (applied/interview/offer/rejected):') || 'applied';
  
  const internship = {
    id: generateId(),
    company: company.trim(),
    jobTitle: jobTitle.trim(),
    status: status.toLowerCase().trim(),
    dateAdded: new Date().toISOString(),
    manual: true
  };
  
  internshipData.push(internship);
  saveInternshipData();
  updateInternshipStats();
  renderInternshipList();
  
  showHint(`Added ${company} manually!`);
}

function editInternship(id) {
  const internship = internshipData.find(i => i.id === id);
  if (!internship) return;
  
  const newStatus = prompt(`Update status for ${internship.company}:\n\nCurrent: ${internship.status}\n\nOptions: applied, interview, offer, rejected`);
  if (!newStatus) return;
  
  internship.status = newStatus.toLowerCase().trim();
  internship.lastUpdated = new Date().toISOString();
  
  saveInternshipData();
  updateInternshipStats();
  renderInternshipList();
  
  showHint(`Updated ${internship.company} status`);
}

function clearAllInternships() {
  const confirmed = confirm('Clear all internship data? This cannot be undone.');
  if (confirmed) {
    internshipData = [];
    saveInternshipData();
    updateInternshipStats();
    renderInternshipList();
    showHint('All internships cleared');
  }
}

function saveInternshipData() {
  localStorage.setItem('internshipData', JSON.stringify(internshipData));
  
  // Also save to electron store if available
  if (window.electron && window.electron.saveInternships) {
    window.electron.saveInternships(internshipData);
  }
}

// Utility functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString, short = false) {
  if (!dateString) return 'No date';
  
  const date = new Date(dateString);
  if (short) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

async function loadDashboardScreenshots() {
  try {
    console.log('Loading dashboard screenshots...');
    screenshotGrid.innerHTML = '<div class="loading-state">Loading screenshots...</div>';
    
    const screenshots = await window.electron.getScreenshots();
    console.log('Retrieved screenshots:', screenshots?.length || 0);
    
    screenshotGrid.innerHTML = '';
    
    if (!screenshots || screenshots.length === 0) {
      screenshotGrid.innerHTML = `
        <div class="empty-state">
          <p>No screenshots yet.<br>Capture one to get started!</p>
        </div>
      `;
      return;
    }
    
    // Show only the latest 12 screenshots
    const recentScreenshots = screenshots.slice(0, 12);
    
    recentScreenshots.forEach(screenshot => {
      const card = createScreenshotCard(screenshot);
      screenshotGrid.appendChild(card);
    });
    
    console.log('Dashboard loaded with', recentScreenshots.length, 'screenshots');
    
  } catch (error) {
    console.error('Error loading screenshots:', error);
    screenshotGrid.innerHTML = `
      <div class="empty-state">
        <p>Error loading screenshots</p>
      </div>
    `;
  }
}

function createScreenshotCard(screenshot) {
  const card = document.createElement('div');
  card.className = 'screenshot-card';
  
  const date = new Date(screenshot.timestamp);
  const timeAgo = getTimeAgo(date);
  
  card.innerHTML = `
    <div class="screenshot-preview">
      <img src="file://${screenshot.thumbnailPath}" alt="${screenshot.name}" loading="lazy">
    </div>
    <div class="screenshot-info">
      <p class="screenshot-name">${screenshot.name}</p>
      <p class="screenshot-date">${timeAgo}</p>
    </div>
  `;
  
  // Add click handlers
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    openScreenshotActions(screenshot);
  });
  
  return card;
}

function openScreenshotActions(screenshot) {
  // Create a simple action menu using confirm dialogs for now
  const action = prompt(`Choose action for ${screenshot.name}:\n1. View\n2. Analyze\n3. Delete\n\nEnter number (1-3):`);
  
  switch (action) {
    case '1':
      window.electron.openScreenshot(screenshot.id);
      break;
    case '2':
      analyzeScreenshot(screenshot.id);
      break;
    case '3':
      deleteScreenshot(screenshot.id);
      break;
  }
}

async function analyzeScreenshot(id) {
  try {
    setStatus('analyzing');
    showHint('Analyzing screenshot...');
    await window.electron.analyzeJobScreenshot(id);
    setStatus('ready');
    showHint('Analysis complete!');
  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    setStatus('error');
    showHint('Analysis failed');
    setTimeout(() => setStatus('ready'), 2000);
  }
}

async function deleteScreenshot(id) {
  const confirmed = confirm('Delete this screenshot?');
  if (confirmed) {
    try {
      await window.electron.deleteScreenshot(id);
      loadDashboardScreenshots();
      showHint('Screenshot deleted');
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      showHint('Delete failed');
    }
  }
}

async function clearAllScreenshots() {
  const confirmed = confirm('Delete all screenshots? This cannot be undone.');
  if (confirmed) {
    try {
      const screenshots = await window.electron.getScreenshots();
      for (const screenshot of screenshots) {
        await window.electron.deleteScreenshot(screenshot.id);
      }
      loadDashboardScreenshots();
      showHint('All screenshots cleared');
    } catch (error) {
      console.error('Error clearing screenshots:', error);
      showHint('Clear failed');
    }
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

function setStatus(status) {
  currentStatus = status;
  statusIndicator.className = `smart-indicator ${status}`;
  
  switch (status) {
    case 'ready':
      statusText.textContent = 'Ready';
      statusIndicator.style.background = '';
      break;
    case 'processing':
      statusText.textContent = 'Capturing...';
      break;
    case 'analyzing':
      statusText.textContent = 'Analyzing...';
      break;
    case 'error':
      statusText.textContent = 'Error';
      statusIndicator.style.background = 'linear-gradient(45deg, #ff4757, #ff6b7a)';
      break;
    case 'idle':
      statusText.textContent = 'Idle';
      break;
  }
}

function handleContextMenu(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const rect = toolbar.getBoundingClientRect();
  contextMenu.style.left = `${e.clientX - rect.left}px`;
  contextMenu.classList.add('active');
}

function hideContextMenu() {
  contextMenu.classList.remove('active');
}

function handleContextMenuClick(e) {
  const action = e.target.dataset.action;
  if (!action) return;
  
  hideContextMenu();
  
  switch (action) {
    case 'tracker':
      window.electron.showTracker();
      break;
    case 'settings':
      showHint('Settings coming soon!');
      break;
    case 'hide':
      hideToolbar();
      break;
  }
}

function showHint(message, duration = 2000) {
  clearTimeout(hintTimeout);
  hintBubble.textContent = message;
  hintBubble.classList.add('show');
  
  hintTimeout = setTimeout(() => {
    hideHint();
  }, duration);
}

function hideHint() {
  hintBubble.classList.remove('show');
}

function hideToolbar() {
  toolbar.style.transition = 'all 0.3s ease';
  toolbar.style.transform = 'scale(0.8)';
  toolbar.style.opacity = '0';
  
  setTimeout(() => {
    if (window.electron && window.electron.hideToolbar) {
      window.electron.hideToolbar();
    }
  }, 300);
}

function startContextDetection() {
  if (!window.electron || !window.electron.detectJobSite) return;
  
  contextDetection = setInterval(async () => {
    try {
      const context = await window.electron.detectJobSite();
      if (context && context.isJobSite) {
        showContextualHints(context);
      }
    } catch (error) {
      // Silently handle errors
    }
  }, 5000);
}

function showContextualHints(context) {
  if (context.site === 'linkedin') {
    analyzeBtn.style.background = 'linear-gradient(135deg, rgba(0, 119, 181, 0.3), rgba(0, 119, 181, 0.2))';
    showHint('LinkedIn detected - great for job analysis!', 3000);
  } else if (context.site === 'indeed') {
    analyzeBtn.style.background = 'linear-gradient(135deg, rgba(45, 107, 248, 0.3), rgba(45, 107, 248, 0.2))';
    showHint('Indeed detected - perfect for capturing job details!', 3000);
  }
}

// Window focus/blur events
window.addEventListener('focus', () => {
  setStatus(isProcessing ? 'processing' : 'ready');
});

window.addEventListener('blur', () => {
  if (!isProcessing) {
    setStatus('idle');
  }
});

// Make window focusable for keyboard shortcuts
document.addEventListener('DOMContentLoaded', () => {
  document.body.tabIndex = -1;
  document.body.focus();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (contextDetection) {
    clearInterval(contextDetection);
  }
  clearTimeout(fadeTimeout);
  clearTimeout(hintTimeout);
});
// Add this to your toolbar.js or create a new email-integration.js file

class EmailIntegrationUI {
  constructor() {
    this.isScanning = false;
    this.scanProgress = 0;
    this.currentScanResults = [];
    this.settings = {
      autoScanEnabled: false,
      scanInterval: 24,
      defaultDaysBack: 90,
      maxResults: 100
    };
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadInitialData();
  }

  initializeElements() {
    // Main elements
    this.emailSection = document.getElementById('emailSettingsSection');
    this.authStatus = document.getElementById('emailAuthStatus');
    this.authIndicator = document.getElementById('authIndicator');
    this.authStatusText = document.getElementById('authStatusText');
    this.authStatusDetail = document.getElementById('authStatusDetail');
    this.authActionBtn = document.getElementById('authActionBtn');
    
    // Action buttons
    this.quickScanBtn = document.getElementById('quickScanBtn');
    this.deepScanBtn = document.getElementById('deepScanBtn');
    this.customScanBtn = document.getElementById('customScanBtn');
    
    // Stats elements
    this.lastScanTime = document.getElementById('lastScanTime');
    this.emailsFound = document.getElementById('emailsFound');
    this.newApplications = document.getElementById('newApplications');
    this.autoScanStatus = document.getElementById('autoScanStatus');
    
    // Results elements
    this.resultsList = document.getElementById('resultsList');
    this.clearResultsBtn = document.getElementById('clearResultsBtn');
    
    // Progress elements
    this.emailProgress = document.getElementById('emailProgress');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.cancelScanBtn = document.getElementById('cancelScanBtn');
    
    // Modal elements
    this.emailModal = document.getElementById('emailModal');
    this.closeEmailModal = document.getElementById('closeEmailModal');
    this.setupGmailBtn = document.getElementById('setupGmailBtn');
    this.testConnectionBtn = document.getElementById('testConnectionBtn');
    this.revokeAccessBtn = document.getElementById('revokeAccessBtn');
    
    // Settings elements
    this.autoScanEnabled = document.getElementById('autoScanEnabled');
    this.scanInterval = document.getElementById('scanInterval');
    this.defaultDaysBack = document.getElementById('defaultDaysBack');
    this.maxResults = document.getElementById('maxResults');
    
    // Export buttons
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.exportCsvBtn = document.getElementById('exportCsvBtn');
    this.clearAllDataBtn = document.getElementById('clearAllDataBtn');
    
    // Modal action buttons
    this.saveEmailSettingsBtn = document.getElementById('saveEmailSettingsBtn');
    this.cancelEmailSettingsBtn = document.getElementById('cancelEmailSettingsBtn');
  }

  setupEventListeners() {
    // Authentication
    this.authActionBtn?.addEventListener('click', () => this.handleAuthAction());
    
    // Scan buttons
    this.quickScanBtn?.addEventListener('click', () => this.handleQuickScan());
    this.deepScanBtn?.addEventListener('click', () => this.handleDeepScan());
    this.customScanBtn?.addEventListener('click', () => this.handleCustomScan());
    
    // Results management
    this.clearResultsBtn?.addEventListener('click', () => this.clearResults());
    
    // Progress
    this.cancelScanBtn?.addEventListener('click', () => this.cancelScan());
    
    // Modal controls
    this.closeEmailModal?.addEventListener('click', () => this.closeModal());
    this.cancelEmailSettingsBtn?.addEventListener('click', () => this.closeModal());
    this.saveEmailSettingsBtn?.addEventListener('click', () => this.saveSettings());
    
    // Settings actions
    this.setupGmailBtn?.addEventListener('click', () => this.setupGmail());
    this.testConnectionBtn?.addEventListener('click', () => this.testConnection());
    this.revokeAccessBtn?.addEventListener('click', () => this.revokeAccess());
    
    // Export actions
    this.exportJsonBtn?.addEventListener('click', () => this.exportResults('json'));
    this.exportCsvBtn?.addEventListener('click', () => this.exportResults('csv'));
    this.clearAllDataBtn?.addEventListener('click', () => this.clearAllData());
    
    // Listen for scan progress updates
    if (window.electron?.onEmailScanProgress) {
      window.electron.onEmailScanProgress((message) => {
        this.updateScanProgress(message);
      });
    }
    
    // Close modal on outside click
    this.emailModal?.addEventListener('click', (e) => {
      if (e.target === this.emailModal) {
        this.closeModal();
      }
    });
  }

  async loadInitialData() {
    try {
      // Load authentication status
      await this.updateAuthStatus();
      
      // Load scan statistics
      await this.updateScanStats();
      
      // Load recent results
      await this.loadRecentResults();
      
      // Load settings
      await this.loadSettings();
      
    } catch (error) {
      console.error('Failed to load email integration data:', error);
    }
  }

  async updateAuthStatus() {
    try {
      const status = await window.electron.emailGetAuthStatus();
      
      if (status.isAuthenticated) {
        this.authIndicator.textContent = '🟢';
        this.authStatusText.textContent = 'Connected';
        this.authStatusDetail.textContent = 'Gmail access active';
        this.authActionBtn.textContent = 'Settings';
        
        // Enable scan buttons
        this.quickScanBtn.disabled = false;
        this.deepScanBtn.disabled = false;
        this.customScanBtn.disabled = false;
        
      } else if (status.hasCredentials) {
        this.authIndicator.textContent = '🟡';
        this.authStatusText.textContent = 'Setup Required';
        this.authStatusDetail.textContent = 'Authentication needed';
        this.authActionBtn.textContent = 'Authenticate';
        
      } else {
        this.authIndicator.textContent = '🔴';
        this.authStatusText.textContent = 'Not Setup';
        this.authStatusDetail.textContent = 'Gmail credentials needed';
        this.authActionBtn.textContent = 'Setup';
      }
      
    } catch (error) {
      console.error('Failed to get auth status:', error);
      this.authIndicator.textContent = '❌';
      this.authStatusText.textContent = 'Error';
      this.authStatusDetail.textContent = 'Connection failed';
    }
  }

  async updateScanStats() {
    try {
      const stats = await window.electron.emailGetScanStats();
      
      if (stats) {
        this.lastScanTime.textContent = stats.lastScanTime ? 
          new Date(stats.lastScanTime).toLocaleDateString() : 'Never';
        this.emailsFound.textContent = stats.totalEmailsFound || 0;
        this.newApplications.textContent = stats.newApplications || 0;
        this.autoScanStatus.textContent = stats.autoScanEnabled ? 
          `Every ${stats.scanInterval}h` : 'Disabled';
      }
      
    } catch (error) {
      console.error('Failed to get scan stats:', error);
    }
  }

  async loadRecentResults() {
    try {
      const results = await window.electron.emailGetRecentResults(5);
      this.currentScanResults = results;
      this.renderResults(results);
      
    } catch (error) {
      console.error('Failed to load recent results:', error);
      this.renderResults([]);
    }
  }

  renderResults(results) {
    if (!this.resultsList) return;
    
    if (results.length === 0) {
      this.resultsList.innerHTML = '<div class="empty-results">No scan results yet</div>';
      return;
    }
    
    this.resultsList.innerHTML = results.map(result => `
      <div class="result-item" data-id="${result.email.id}">
        <div class="result-info">
          <div class="result-company">${result.internship.companyName}</div>
          <div class="result-position">${result.internship.jobTitle}</div>
        </div>
        <div class="result-confidence">${result.internship.confidence}%</div>
      </div>
    `).join('');
    
    // Add click handlers
    this.resultsList.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.showResultDetails(id);
      });
    });
  }

  async handleAuthAction() {
    const status = await window.electron.emailGetAuthStatus();
    
    if (status.isAuthenticated) {
      // Show settings modal
      this.showModal();
    } else {
      // Setup or authenticate Gmail
      await this.setupGmail();
    }
  }

  async handleQuickScan() {
    if (this.isScanning) return;
    
    try {
      this.startScanUI('Quick scanning last 7 days...');
      
      const results = await window.electron.emailQuickScan();
      await this.processScanResults(results);
      
    } catch (error) {
      this.showError('Quick scan failed', error.message);
    } finally {
      this.endScanUI();
    }
  }

  async handleDeepScan() {
    if (this.isScanning) return;
    
    const confirmed = confirm('Deep scan will search the last 6 months of emails. This may take several minutes. Continue?');
    if (!confirmed) return;
    
    try {
      this.startScanUI('Deep scanning last 6 months...');
      
      const results = await window.electron.emailDeepScan();
      await this.processScanResults(results);
      
    } catch (error) {
      this.showError('Deep scan failed', error.message);
    } finally {
      this.endScanUI();
    }
  }

  async handleCustomScan() {
    if (this.isScanning) return;
    
    // Show custom scan options
    const daysBack = prompt('How many days back to scan?', '30');
    if (!daysBack) return;
    
    const maxResults = prompt('Maximum emails to scan?', '50');
    if (!maxResults) return;
    
    try {
      this.startScanUI(`Custom scanning last ${daysBack} days...`);
      
      const results = await window.electron.emailScanInternships({
        daysBack: parseInt(daysBack),
        maxResults: parseInt(maxResults)
      });
      
      await this.processScanResults(results);
      
    } catch (error) {
      this.showError('Custom scan failed', error.message);
    } finally {
      this.endScanUI();
    }
  }

  async processScanResults(results) {
    console.log('Processing scan results:', results.length);
    
    if (results.length === 0) {
      this.showInfo('No New Applications', 'No new internship applications found in your emails.');
      return;
    }
    
    // Show results summary
    const newApps = results.filter(r => r.isNew).length;
    const message = `Found ${results.length} internship emails.\n${newApps} new applications detected.\n\nAdd them to your tracker?`;
    
    const shouldAdd = confirm(message);
    
    if (shouldAdd) {
      try {
        const addResult = await window.electron.emailAddToTracker(results, { 
          autoAdd: true, 
          confirmEach: false 
        });
        
        this.showSuccess('Applications Added', 
          `Added ${addResult.added} new applications to your tracker.`);
        
        // Update UI
        await this.updateScanStats();
        await this.loadRecentResults();
        
        // Notify other parts of the app
        if (window.loadInternshipData) {
          window.loadInternshipData();
        }
        
      } catch (error) {
        this.showError('Add Failed', `Failed to add applications: ${error.message}`);
      }
    }
  }

  startScanUI(message) {
    this.isScanning = true;
    this.scanProgress = 0;
    
    // Disable scan buttons
    this.quickScanBtn.disabled = true;
    this.deepScanBtn.disabled = true;
    this.customScanBtn.disabled = true;
    
    // Show progress
    if (this.emailProgress) {
      this.emailProgress.style.display = 'block';
      this.progressText.textContent = message;
      this.progressFill.style.width = '0%';
    }
  }

  updateScanProgress(message, progress = null) {
    if (this.progressText) {
      this.progressText.textContent = message;
    }
    
    if (progress !== null && this.progressFill) {
      this.scanProgress = Math.min(100, Math.max(0, progress));
      this.progressFill.style.width = `${this.scanProgress}%`;
    }
  }

  endScanUI() {
    this.isScanning = false;
    
    // Re-enable scan buttons
    this.quickScanBtn.disabled = false;
    this.deepScanBtn.disabled = false;
    this.customScanBtn.disabled = false;
    
    // Hide progress
    if (this.emailProgress) {
      setTimeout(() => {
        this.emailProgress.style.display = 'none';
      }, 1000);
    }
  }

  cancelScan() {
    // In a real implementation, you'd cancel the ongoing scan
    this.endScanUI();
    this.showInfo('Scan Cancelled', 'Email scan was cancelled.');
  }

  async clearResults() {
    const confirmed = confirm('Clear all email scan results? This cannot be undone.');
    if (!confirmed) return;
    
    try {
      await window.electron.emailClearResults();
      await this.loadRecentResults();
      await this.updateScanStats();
      this.showSuccess('Results Cleared', 'All email scan results have been cleared.');
      
    } catch (error) {
      this.showError('Clear Failed', error.message);
    }
  }

  showModal() {
    if (this.emailModal) {
      this.emailModal.style.display = 'flex';
      this.loadModalSettings();
    }
  }

  closeModal() {
    if (this.emailModal) {
      this.emailModal.style.display = 'none';
    }
  }

  async loadModalSettings() {
    try {
      const stats = await window.electron.emailGetScanStats();
      
      if (stats) {
        this.autoScanEnabled.checked = stats.autoScanEnabled;
        this.scanInterval.value = stats.scanInterval || 24;
        this.settings.autoScanEnabled = stats.autoScanEnabled;
        this.settings.scanInterval = stats.scanInterval || 24;
      }
      
    } catch (error) {
      console.error('Failed to load modal settings:', error);
    }
  }

  async loadSettings() {
    // Load settings from localStorage or electron store
    const stored = localStorage.getItem('emailIntegrationSettings');
    if (stored) {
      this.settings = { ...this.settings, ...JSON.parse(stored) };
    }
    
    // Update UI elements
    if (this.defaultDaysBack) {
      this.defaultDaysBack.value = this.settings.defaultDaysBack;
    }
    if (this.maxResults) {
      this.maxResults.value = this.settings.maxResults;
    }
  }

  async saveSettings() {
    try {
      // Get values from form
      const newSettings = {
        autoScanEnabled: this.autoScanEnabled.checked,
        scanInterval: parseInt(this.scanInterval.value),
        defaultDaysBack: parseInt(this.defaultDaysBack.value),
        maxResults: parseInt(this.maxResults.value)
      };
      
      // Save to electron
      await window.electron.emailConfigureAutoScan(
        newSettings.autoScanEnabled, 
        newSettings.scanInterval
      );
      
      // Save locally
      this.settings = { ...this.settings, ...newSettings };
      localStorage.setItem('emailIntegrationSettings', JSON.stringify(this.settings));
      
      this.closeModal();
      this.showSuccess('Settings Saved', 'Email integration settings have been saved.');
      
      // Update UI
      await this.updateScanStats();
      
    } catch (error) {
      this.showError('Save Failed', error.message);
    }
  }

  async setupGmail() {
    try {
      const result = await window.electron.emailSetupGmail();
      if (result) {
        await this.updateAuthStatus();
        this.showSuccess('Setup Complete', 'Gmail has been set up successfully!');
      }
    } catch (error) {
      this.showError('Setup Failed', error.message);
    }
  }

  async testConnection() {
    try {
      this.testConnectionBtn.textContent = 'Testing...';
      this.testConnectionBtn.disabled = true;
      
      const result = await window.electron.emailTestConnection();
      
      if (result) {
        this.showSuccess('Connection Test', 'Gmail connection is working properly!');
      } else {
        this.showError('Connection Test', 'Gmail connection failed. Please check your setup.');
      }
      
    } catch (error) {
      this.showError('Connection Test', error.message);
    } finally {
      this.testConnectionBtn.textContent = 'Test Connection';
      this.testConnectionBtn.disabled = false;
    }
  }

  async revokeAccess() {
    const confirmed = confirm('Are you sure you want to revoke Gmail access? This will clear all stored data and tokens.');
    if (!confirmed) return;
    
    try {
      const result = await window.electron.emailRevokeAccess();
      if (result) {
        await this.updateAuthStatus();
        await this.updateScanStats();
        await this.loadRecentResults();
        this.closeModal();
        this.showSuccess('Access Revoked', 'Gmail access has been revoked successfully.');
      }
    } catch (error) {
      this.showError('Revoke Failed', error.message);
    }
  }

  async exportResults(format) {
    try {
      const result = await window.electron.emailExportResults(format);
      if (result) {
        this.showSuccess('Export Complete', `Results exported as ${format.toUpperCase()} successfully!`);
      }
    } catch (error) {
      this.showError('Export Failed', error.message);
    }
  }

  async clearAllData() {
    const confirmed = confirm('Clear ALL email integration data? This includes:\n- Scan results\n- Stored tokens\n- Settings\n\nThis cannot be undone.');
    if (!confirmed) return;
    
    const doubleConfirm = confirm('Are you absolutely sure? This will completely reset the email integration.');
    if (!doubleConfirm) return;
    
    try {
      await window.electron.emailRevokeAccess();
      await window.electron.emailClearResults();
      localStorage.removeItem('emailIntegrationSettings');
      
      // Reset UI
      await this.updateAuthStatus();
      await this.updateScanStats();
      await this.loadRecentResults();
      
      this.closeModal();
      this.showSuccess('Data Cleared', 'All email integration data has been cleared.');
      
    } catch (error) {
      this.showError('Clear Failed', error.message);
    }
  }

  showResultDetails(emailId) {
    const result = this.currentScanResults.find(r => r.email.id === emailId);
    if (!result) return;
    
    const details = `
Company: ${result.internship.companyName}
Position: ${result.internship.jobTitle}
Location: ${result.internship.location}
Status: ${result.internship.status}
Confidence: ${result.internship.confidence}%

Email Subject: ${result.email.subject}
From: ${result.email.from}
Date: ${new Date(result.email.date).toLocaleDateString()}

${result.isNew ? 'This is a NEW application not yet in your tracker.' : 'This application already exists in your tracker.'}
    `.trim();
    
    alert(details);
  }

  // Utility methods for showing messages
  showSuccess(title, message) {
    this.showNotification('success', title, message);
  }

  showError(title, message) {
    this.showNotification('error', title, message);
  }

  showInfo(title, message) {
    this.showNotification('info', title, message);
  }

  showNotification(type, title, message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `email-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="notification-title">${title}</span>
        <button class="notification-close">&times;</button>
      </div>
      <div class="notification-message">${message}</div>
    `;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'rgba(0, 255, 135, 0.1)' : 
                   type === 'error' ? 'rgba(255, 107, 107, 0.1)' : 
                   'rgba(96, 239, 255, 0.1)'};
      border: 1px solid ${type === 'success' ? 'rgba(0, 255, 135, 0.3)' : 
                         type === 'error' ? 'rgba(255, 107, 107, 0.3)' : 
                         'rgba(96, 239, 255, 0.3)'};
      border-radius: 12px;
      padding: 16px;
      max-width: 300px;
      backdrop-filter: blur(10px);
      z-index: 10002;
      animation: slideInRight 0.3s ease;
      color: white;
      font-size: 12px;
    `;
    
    // Add styles for notification elements
    const style = document.createElement('style');
    style.textContent = `
      .notification-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .notification-title {
        flex: 1;
        font-weight: 600;
      }
      .notification-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      .notification-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      .notification-message {
        font-size: 11px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.9);
      }
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto-close after 5 seconds
    const autoClose = setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);
    
    // Manual close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      clearTimeout(autoClose);
      this.removeNotification(notification);
    });
  }

  removeNotification(notification) {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  // Public method to show/hide the email section
  toggleEmailSection(show) {
    if (this.emailSection) {
      this.emailSection.style.display = show ? 'block' : 'none';
    }
  }

  // Refresh all data
  async refresh() {
    await this.loadInitialData();
  }

  // Get current status for external use
  getStatus() {
    return {
      isScanning: this.isScanning,
      scanProgress: this.scanProgress,
      resultsCount: this.currentScanResults.length,
      settings: this.settings
    };
  }
}

// Initialize email integration when the page loads
let emailIntegrationUI = null;

document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if the email section exists
  if (document.getElementById('emailSettingsSection')) {
    emailIntegrationUI = new EmailIntegrationUI();
    
    // Make it globally available
    window.emailIntegrationUI = emailIntegrationUI;
    
    console.log('📧 Email Integration UI initialized');
  }
});

// Add email tab to existing dashboard tabs functionality
if (typeof switchTab === 'function') {
  const originalSwitchTab = switchTab;
  switchTab = function(tabName) {
    originalSwitchTab(tabName);
    
    // Show/hide email section based on tab
    if (emailIntegrationUI) {
      emailIntegrationUI.toggleEmailSection(tabName === 'email');
    }
  };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EmailIntegrationUI };
}