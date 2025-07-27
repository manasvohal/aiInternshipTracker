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
class EmailScanManager {
  constructor() {
    this.isInitialized = false;
    this.authStatus = {
      isAuthenticated: false,
      hasCredentials: false
    };
    
    this.setupEmailButton();
    this.initializeEmailIntegration();
  }

  async initializeEmailIntegration() {
    try {
      const result = await window.electron.emailInitialize();
      
      if (result.success) {
        this.authStatus = {
          isAuthenticated: true,
          hasCredentials: true
        };
        this.updateEmailButtonState();
        console.log('✅ Email integration initialized');
      } else if (result.needsSetup) {
        this.authStatus = {
          isAuthenticated: false,
          hasCredentials: false
        };
        this.updateEmailButtonState();
        console.log('⚠️ Email setup required');
      } else if (result.needsAuth) {
        this.authStatus = {
          isAuthenticated: false,
          hasCredentials: true
        };
        this.updateEmailButtonState();
        console.log('⚠️ Email authentication required');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Email integration initialization failed:', error);
      this.updateEmailButtonState(error.message);
    }
  }

  setupEmailButton() {
    const gmailScanBtn = document.getElementById('gmailScanBtn');
    
    if (gmailScanBtn) {
      gmailScanBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleEmailScanClick();
      });

      // Add hover effect
      gmailScanBtn.addEventListener('mouseenter', () => {
        this.showEmailButtonHint();
      });

      gmailScanBtn.addEventListener('mouseleave', () => {
        hideHint();
      });
    }
  }

  updateEmailButtonState(errorMessage = null) {
    const gmailScanBtn = document.getElementById('gmailScanBtn');
    if (!gmailScanBtn) return;

    // Reset classes
    gmailScanBtn.classList.remove('authenticated', 'needs-setup', 'needs-auth', 'error');

    if (errorMessage) {
      gmailScanBtn.classList.add('error');
      gmailScanBtn.disabled = true;
      gmailScanBtn.title = `Error: ${errorMessage}`;
    } else if (this.authStatus.isAuthenticated) {
      gmailScanBtn.classList.add('authenticated');
      gmailScanBtn.disabled = false;
      gmailScanBtn.title = 'Scan Gmail for internship applications';
    } else if (this.authStatus.hasCredentials) {
      gmailScanBtn.classList.add('needs-auth');
      gmailScanBtn.disabled = false;
      gmailScanBtn.title = 'Click to authenticate with Gmail';
    } else {
      gmailScanBtn.classList.add('needs-setup');
      gmailScanBtn.disabled = false;
      gmailScanBtn.title = 'Click to setup Gmail integration';
    }
  }

  showEmailButtonHint() {
    let hintText = 'Gmail scan';
    
    if (!this.isInitialized) {
      hintText = 'Initializing Gmail...';
    } else if (!this.authStatus.hasCredentials) {
      hintText = 'Setup Gmail integration';
    } else if (!this.authStatus.isAuthenticated) {
      hintText = 'Authenticate Gmail';
    } else {
      hintText = 'Scan emails for internships';
    }
    
    showHint(hintText);
  }

  async handleEmailScanClick() {
    if (!this.isInitialized) {
      showHint('Please wait, initializing...');
      return;
    }

    try {
      if (!this.authStatus.hasCredentials) {
        await this.setupGmailCredentials();
      } else if (!this.authStatus.isAuthenticated) {
        await this.authenticateGmail();
      } else {
        await this.performEmailScan();
      }
    } catch (error) {
      console.error('❌ Email scan error:', error);
      showHint(`Error: ${error.message}`);
    }
  }

  async setupGmailCredentials() {
    try {
      showHint('Opening setup dialog...');
      
      const result = await window.electron.emailSetupCredentials();
      
      if (result.success) {
        this.authStatus.hasCredentials = true;
        this.updateEmailButtonState();
        showHint('Credentials saved! Click again to authenticate.');
      } else if (!result.cancelled) {
        showHint(`Setup failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Credential setup failed:', error);
      showHint('Setup failed');
    }
  }

  async authenticateGmail() {
    try {
      showHint('Starting Gmail authentication...');
      
      const result = await window.electron.emailStartAuth();
      
      if (result.success) {
        this.authStatus.isAuthenticated = true;
        this.updateEmailButtonState();
        showHint(`Connected to ${result.email}!`);
        
        // Automatically perform first scan
        setTimeout(() => {
          this.performEmailScan();
        }, 1000);
      } else if (!result.cancelled) {
        showHint(`Authentication failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Gmail authentication failed:', error);
      showHint('Authentication failed');
    }
  }

  async performEmailScan() {
    try {
      setStatus('processing');
      showHint('Scanning Gmail for internships...');
      
      // Show scan options
      const scanType = await this.showScanOptions();
      
      if (!scanType) {
        setStatus('ready');
        return;
      }

      let results;
      
      if (scanType === 'quick') {
        results = await window.electron.emailQuickScan();
        showHint(`Quick scan complete! Found ${results.length} emails.`);
      } else if (scanType === 'deep') {
        results = await window.electron.emailDeepScan();
        showHint(`Deep scan complete! Found ${results.length} emails.`);
      } else {
        // Custom scan
        results = await window.electron.emailScanInternships(scanType);
        showHint(`Scan complete! Found ${results.length} emails.`);
      }

      // Update internship data if new applications were added
      if (results.length > 0) {
        const newApps = results.filter(r => r.isNew).length;
        if (newApps > 0) {
          loadInternshipData(); // Refresh internship display
          showHint(`Added ${newApps} new applications!`);
        }
      }

      setStatus('ready');
    } catch (error) {
      console.error('❌ Email scan failed:', error);
      showHint(`Scan failed: ${error.message}`);
      setStatus('ready');
    }
  }

  async showScanOptions() {
    return new Promise((resolve) => {
      // Create a simple modal for scan options
      const modal = document.createElement('div');
      modal.className = 'scan-options-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
      `;

      modal.innerHTML = `
        <div style="
          background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(45, 45, 45, 0.95));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 30px;
          max-width: 400px;
          text-align: center;
          color: white;
        ">
          <h3 style="margin: 0 0 20px 0; color: #60efff;">📧 Gmail Scan Options</h3>
          <p style="margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.8); font-size: 14px;">
            Choose how you want to scan your emails:
          </p>
          
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button class="scan-option-btn" data-type="quick" style="
              background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 255, 135, 0.2));
              border: 1px solid rgba(0, 212, 255, 0.3);
              color: white;
              padding: 15px;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s ease;
            ">
              <strong>⚡ Quick Scan</strong><br>
              <small>Last 7 days • ~25 emails • Fast</small>
            </button>
            
            <button class="scan-option-btn" data-type="deep" style="
              background: linear-gradient(135deg, rgba(255, 167, 38, 0.2), rgba(255, 107, 107, 0.2));
              border: 1px solid rgba(255, 167, 38, 0.3);
              color: white;
              padding: 15px;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s ease;
            ">
              <strong>🔍 Deep Scan</strong><br>
              <small>Last 6 months • ~100 emails • Thorough</small>
            </button>
            
            <button class="scan-option-btn" data-type="custom" style="
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: white;
              padding: 15px;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s ease;
            ">
              <strong>⚙️ Custom Scan</strong><br>
              <small>Choose your own settings</small>
            </button>
          </div>
          
          <button id="cancelScanOptions" style="
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            padding: 10px;
            margin-top: 15px;
            cursor: pointer;
            font-size: 12px;
          ">Cancel</button>
        </div>
      `;

      document.body.appendChild(modal);

      // Add event listeners
      modal.querySelectorAll('.scan-option-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'translateY(0) scale(1)';
        });
        
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          modal.remove();
          
          if (type === 'custom') {
            // Show custom options
            this.showCustomScanOptions().then(resolve);
          } else {
            resolve(type);
          }
        });
      });

      document.getElementById('cancelScanOptions').addEventListener('click', () => {
        modal.remove();
        resolve(null);
      });

      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve(null);
        }
      });
    });
  }

  async showCustomScanOptions() {
    return new Promise((resolve) => {
      const daysBack = prompt('How many days back to scan?', '30');
      if (!daysBack) {
        resolve(null);
        return;
      }

      const maxResults = prompt('Maximum emails to scan?', '50');
      if (!maxResults) {
        resolve(null);
        return;
      }

      resolve({
        daysBack: parseInt(daysBack) || 30,
        maxResults: parseInt(maxResults) || 50
      });
    });
  }

  // Method to refresh auth status
  async refreshAuthStatus() {
    try {
      const status = await window.electron.emailGetAuthStatus();
      this.authStatus = status;
      this.updateEmailButtonState();
    } catch (error) {
      console.error('❌ Error refreshing auth status:', error);
    }
  }

  // Method to test connection
  async testConnection() {
    try {
      const result = await window.electron.emailTestConnection();
      
      if (result.success) {
        showHint(`Connected to ${result.email}`);
        this.authStatus.isAuthenticated = true;
        this.updateEmailButtonState();
      } else {
        showHint(`Connection failed: ${result.error}`);
        if (result.needsReauth) {
          this.authStatus.isAuthenticated = false;
          this.updateEmailButtonState();
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      showHint('Connection test failed');
      return { success: false, error: error.message };
    }
  }
}

// Initialize email scan manager when the toolbar loads
let emailScanManager = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize email scan manager
  emailScanManager = new EmailScanManager();
  
  // Make it globally available for debugging
  window.emailScanManager = emailScanManager;
  
  console.log('📧 Email scan manager initialized');
});

// Add CSS for the email button states
const emailButtonStyles = document.createElement('style');
emailButtonStyles.textContent = `
  #gmailScanBtn.authenticated {
    background: linear-gradient(135deg, rgba(0, 255, 135, 0.25), rgba(96, 239, 255, 0.25));
    border-color: rgba(0, 255, 135, 0.4);
  }
  
  #gmailScanBtn.needs-auth {
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.25), rgba(255, 167, 38, 0.25));
    border-color: rgba(255, 193, 7, 0.4);
  }
  
  #gmailScanBtn.needs-setup {
    background: linear-gradient(135deg, rgba(108, 117, 125, 0.25), rgba(73, 80, 87, 0.25));
    border-color: rgba(108, 117, 125, 0.4);
  }
  
  #gmailScanBtn.error {
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.25), rgba(220, 53, 69, 0.25));
    border-color: rgba(255, 107, 107, 0.4);
  }
  
  .scan-options-modal .scan-option-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
`;

document.head.appendChild(emailButtonStyles);