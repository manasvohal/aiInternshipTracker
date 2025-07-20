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
const dashboardTabs = document.querySelectorAll('.dashboard-tab');
const tabContents = document.querySelectorAll('.tab-content');

// Screenshots tab
const screenshotsTab = document.getElementById('screenshotsTab');
const screenshotGrid = document.getElementById('screenshotGrid');
const refreshScreenshots = document.getElementById('refreshScreenshots');
const clearScreenshots = document.getElementById('clearScreenshots');

// Internships tab
const internshipsTab = document.getElementById('internshipsTab');
const internshipGrid = document.getElementById('internshipGrid');
const addInternship = document.getElementById('addInternship');
const refreshInternships = document.getElementById('refreshInternships');

// State management
let currentStatus = 'ready';
let isProcessing = false;
let fadeTimeout = null;
let hintTimeout = null;
let contextDetection = null;
let isDashboardOpen = false;
let activeTab = 'screenshots';
let isDragging = false;

// Initialize toolbar
document.addEventListener('DOMContentLoaded', () => {
  initializeToolbar();
  setupEventListeners();
  startContextDetection();
  loadTabContent();
  setupCleanup();
});

function setupCleanup() {
  // Clean up any lingering styles periodically
  setInterval(() => {
    if (!isProcessing) {
      // Ensure toolbar has no unexpected transforms that would interfere with movement
      const currentTransform = toolbar.style.transform;
      if (currentTransform && 
          currentTransform !== 'translateZ(0)' && 
          !currentTransform.includes('translateY') && 
          !currentTransform.includes('scale')) {
        toolbar.style.transform = '';
      }
      
      // Reset cursor if stuck
      if (toolbar.style.cursor === 'grabbing' && !isDragging) {
        toolbar.style.cursor = 'move';
      }
    }
  }, 1000);
}

function initializeToolbar() {
  setStatus('ready');
  setupDragBehavior();
  setupKeyboardShortcuts();
  setupAutoFade();
  setupLiquidAnimations();
}

function setupLiquidAnimations() {
  // Add stagger delay to buttons for liquid effect
  const buttons = document.querySelectorAll('.action-btn');
  buttons.forEach((btn, index) => {
    btn.style.animationDelay = `${index * 0.1}s`;
  });

  // Add liquid ripple effect to clicks
  buttons.forEach(btn => {
    btn.addEventListener('click', createRippleEffect);
  });
}

function createRippleEffect(e) {
  const button = e.currentTarget;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  
  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: liquidRipple 0.6s ease-out;
    left: ${x}px;
    top: ${y}px;
    width: ${size}px;
    height: ${size}px;
    pointer-events: none;
  `;
  
  button.style.position = 'relative';
  button.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
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
  
  // Dashboard toggle
  dashboardToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleDashboard();
  });
  
  // Tab switching with liquid animation
  dashboardTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      switchTab(tab.dataset.tab);
    });
  });
  
  // Screenshots tab actions
  if (refreshScreenshots) {
    refreshScreenshots.addEventListener('click', (e) => {
      e.stopPropagation();
      loadScreenshots();
      showHint('Screenshots refreshed', 1500);
    });
  }
  
  if (clearScreenshots) {
    clearScreenshots.addEventListener('click', (e) => {
      e.stopPropagation();
      clearAllScreenshots();
    });
  }
  
  // Internships tab actions
  if (addInternship) {
    addInternship.addEventListener('click', (e) => {
      e.stopPropagation();
      openAddInternshipDialog();
    });
  }
  
  if (refreshInternships) {
    refreshInternships.addEventListener('click', (e) => {
      e.stopPropagation();
      loadInternships();
      showHint('Internships refreshed', 1500);
    });
  }
  
  // Context menu
  toolbar.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu') && !e.target.closest('.floating-toolbar')) {
      hideContextMenu();
    }
    if (!e.target.closest('.dashboard-dropdown') && 
        !e.target.closest('.dashboard-toggle') && 
        !e.target.closest('.floating-toolbar')) {
      closeDashboard();
    }
  });
  
  contextMenu.addEventListener('click', handleContextMenuClick);
  
  // Hover effects for hints with liquid timing
  captureBtn.addEventListener('mouseenter', () => showHint('Capture screenshot', 3000));
  analyzeBtn.addEventListener('mouseenter', () => showHint('Capture and analyze job posting', 3000));
  dashboardToggle.addEventListener('mouseenter', () => showHint('Toggle dashboard', 3000));
  
  [captureBtn, analyzeBtn, dashboardToggle].forEach(btn => {
    btn.addEventListener('mouseleave', () => hideHint());
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Listen for new data
  if (window.electron) {
    if (window.electron.onScreenshotAdded) {
      window.electron.onScreenshotAdded((screenshot) => {
        if (activeTab === 'screenshots') {
          loadScreenshots();
        }
        if (!isDashboardOpen) {
          openDashboard('screenshots');
          showHint('New screenshot added!', 2000);
        }
      });
    }
    
    if (window.electron.onInternshipsUpdated) {
      window.electron.onInternshipsUpdated(() => {
        if (activeTab === 'internships') {
          loadInternships();
        }
      });
    }
  }
}

// Liquid tab switching animation
function switchTab(tabName) {
  if (tabName === activeTab) return;
  
  // Update tab active states with liquid animation
  dashboardTabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    }
  });
  
  // Simple content switching without sliding animations
  const currentContent = document.querySelector('.tab-content.active');
  const newContent = document.getElementById(`${tabName}Tab`);
  
  if (currentContent) {
    // Simple fade transition instead of sliding
    currentContent.style.opacity = '0';
    
    setTimeout(() => {
      currentContent.classList.remove('active');
      currentContent.style.opacity = '';
      
      newContent.classList.add('active');
      newContent.style.opacity = '0';
      
      // Force reflow
      newContent.offsetHeight;
      
      newContent.style.transition = 'opacity 0.3s ease';
      newContent.style.opacity = '1';
      
      setTimeout(() => {
        newContent.style.transition = '';
        newContent.style.opacity = '';
      }, 300);
    }, 150);
  }
  
  activeTab = tabName;
  loadTabContent();
}

function loadTabContent() {
  if (activeTab === 'screenshots') {
    loadScreenshots();
  } else if (activeTab === 'internships') {
    loadInternships();
  }
}

// Enhanced dashboard functions
function toggleDashboard() {
  if (isDashboardOpen) {
    closeDashboard();
  } else {
    openDashboard();
  }
}

function openDashboard(tab = null) {
  isDashboardOpen = true;
  
  // Clean up any previous state
  toolbar.style.transform = '';
  dashboardTabs.forEach(tab => {
    tab.style.opacity = '';
    tab.style.transform = '';
    tab.style.animation = '';
  });
  
  if (tab) {
    switchTab(tab);
  }
  
  // Open dashboard immediately
  dashboardDropdown.classList.add('open');
  toolbar.classList.add('dashboard-open');
  dashboardToggle.classList.add('active');
  
  // Resize window immediately
  if (window.electron && window.electron.resizeWindow) {
    window.electron.resizeWindow(400, 456); // Increased for tabs
  }
  
  loadTabContent();
  showHint('Dashboard opened', 1500);
}

function closeDashboard() {
  if (!isDashboardOpen) return;
  
  isDashboardOpen = false;
  
  // Immediately hide the dropdown
  dashboardDropdown.classList.remove('open');
  toolbar.classList.remove('dashboard-open');
  dashboardToggle.classList.remove('active');
  
  // Clean up any lingering styles
  dashboardTabs.forEach(tab => {
    tab.style.opacity = '';
    tab.style.transform = '';
    tab.style.animation = '';
  });
  
  // Reset any toolbar transforms
  toolbar.style.transform = '';
  
  // Resize window back immediately
  if (window.electron && window.electron.resizeWindow) {
    window.electron.resizeWindow(400, 64);
  }
}

// Screenshot functions
async function loadScreenshots() {
  try {
    screenshotGrid.innerHTML = '<div class="loading-state">Loading screenshots...</div>';
    
    const screenshots = await window.electron.getScreenshots();
    screenshotGrid.innerHTML = '';
    
    if (!screenshots || screenshots.length === 0) {
      screenshotGrid.innerHTML = `
        <div class="empty-state">
          <p>No screenshots yet.<br>Capture one to get started!</p>
        </div>
      `;
      return;
    }
    
    const recentScreenshots = screenshots.slice(0, 15);
    
    // Staggered animation for cards
    recentScreenshots.forEach((screenshot, index) => {
      setTimeout(() => {
        const card = createScreenshotCard(screenshot);
        card.style.animation = `liquidSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both`;
        screenshotGrid.appendChild(card);
      }, index * 50);
    });
    
  } catch (error) {
    console.error('Error loading screenshots:', error);
    screenshotGrid.innerHTML = `<div class="empty-state"><p>Error loading screenshots</p></div>`;
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
  
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    openScreenshotActions(screenshot);
  });
  
  return card;
}

// Internship functions
async function loadInternships() {
  try {
    internshipGrid.innerHTML = '<div class="loading-state">Loading internships...</div>';
    
    const internships = await window.electron.getInternships();
    internshipGrid.innerHTML = '';
    
    if (!internships || internships.length === 0) {
      internshipGrid.innerHTML = `
        <div class="empty-state">
          <p>No internships tracked yet.<br>Add one to get started!</p>
        </div>
      `;
      return;
    }
    
    // Sort by most recent
    const sortedInternships = internships.sort((a, b) => 
      new Date(b.addedAt || 0) - new Date(a.addedAt || 0)
    ).slice(0, 20);
    
    // Staggered animation for cards
    sortedInternships.forEach((internship, index) => {
      setTimeout(() => {
        const card = createInternshipCard(internship);
        card.style.animation = `liquidSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both`;
        internshipGrid.appendChild(card);
      }, index * 30);
    });
    
  } catch (error) {
    console.error('Error loading internships:', error);
    internshipGrid.innerHTML = `<div class="empty-state"><p>Error loading internships</p></div>`;
  }
}

function createInternshipCard(internship) {
  const card = document.createElement('div');
  card.className = 'internship-card';
  
  const date = new Date(internship.addedAt || Date.now());
  const timeAgo = getTimeAgo(date);
  
  card.innerHTML = `
    <div class="internship-header">
      <h4 class="internship-company">${internship.companyName || 'Unknown Company'}</h4>
      <span class="internship-status status-${internship.status || 'interested'}">
        ${internship.status || 'Interested'}
      </span>
    </div>
    <p class="internship-title">${internship.jobTitle || 'Position not specified'}</p>
    <p class="internship-date">Added ${timeAgo}</p>
  `;
  
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    openInternshipActions(internship);
  });
  
  return card;
}

function openAddInternshipDialog() {
  const companyName = prompt('Company Name:');
  if (!companyName) return;
  
  const jobTitle = prompt('Job Title:');
  if (!jobTitle) return;
  
  const location = prompt('Location (optional):') || '';
  
  const internshipData = {
    companyName,
    jobTitle,
    location,
    status: 'interested',
    addedAt: new Date().toISOString()
  };
  
  window.electron.addInternship(internshipData).then(() => {
    loadInternships();
    showHint('Internship added!', 2000);
  }).catch(error => {
    console.error('Error adding internship:', error);
    showHint('Failed to add internship', 2000);
  });
}

function openInternshipActions(internship) {
  const action = prompt(`${internship.companyName} - ${internship.jobTitle}\n\n1. Edit Status\n2. Delete\n\nEnter number (1-2):`);
  
  switch (action) {
    case '1':
      editInternshipStatus(internship);
      break;
    case '2':
      deleteInternship(internship.id);
      break;
  }
}

function editInternshipStatus(internship) {
  const newStatus = prompt(`Current status: ${internship.status}\n\nNew status:\n1. Interested\n2. Applied\n3. Interviewing\n4. Rejected\n5. Accepted\n\nEnter number (1-5):`);
  
  const statusMap = {
    '1': 'interested',
    '2': 'applied', 
    '3': 'interviewing',
    '4': 'rejected',
    '5': 'accepted'
  };
  
  if (statusMap[newStatus]) {
    window.electron.updateInternship(internship.id, { status: statusMap[newStatus] }).then(() => {
      loadInternships();
      showHint('Status updated!', 2000);
    });
  }
}

function deleteInternship(id) {
  const confirmed = confirm('Delete this internship?');
  if (confirmed) {
    window.electron.deleteInternship(id).then(() => {
      loadInternships();
      showHint('Internship deleted', 2000);
    });
  }
}

// Existing functions with liquid enhancements...
function setupDragBehavior() {
  let dragStartX = 0;
  let dragStartY = 0;
  let windowStartX = 0;
  let windowStartY = 0;

  toolbar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.action-btn') || 
        e.target.closest('.context-menu') || 
        e.target.closest('.hint-bubble') ||
        e.target.closest('.dashboard-dropdown') ||
        e.target.closest('.dashboard-tab') ||
        e.target.closest('.tab-btn')) {
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
        toolbar.style.transition = 'opacity 0.8s ease';
        toolbar.style.opacity = '0.85';
        toolbar.style.transform = '';
      }
    }, 4000);
  }
  
  function cancelFadeTimer() {
    clearTimeout(fadeTimeout);
    toolbar.style.transition = 'opacity 0.2s ease';
    toolbar.style.opacity = '1';
    toolbar.style.transform = '';
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
  // Arrow key movement - always allow movement unless actively typing in dashboard
  const isTypingInDashboard = isDashboardOpen && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
  
  if ((e.ctrlKey || e.metaKey || document.activeElement === document.body) && !isTypingInDashboard) {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveWindowWithArrows('up');
        showHint('↑ Moving up', 1000);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveWindowWithArrows('down');
        showHint('↓ Moving down', 1000);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveWindowWithArrows('left');
        showHint('← Moving left', 1000);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveWindowWithArrows('right');
        showHint('→ Moving right', 1000);
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
    case '1':
      if (!e.ctrlKey && !e.metaKey && isDashboardOpen) {
        switchTab('screenshots');
      }
      break;
    case '2':
      if (!e.ctrlKey && !e.metaKey && isDashboardOpen) {
        switchTab('internships');
      }
      break;
  }
}

async function handleCapture(shouldAnalyze = false) {
  if (isProcessing) return;
  
  try {
    setStatus('processing');
    isProcessing = true;
    
    // Simple processing feedback
    toolbar.style.transition = 'opacity 0.2s ease';
    toolbar.style.opacity = '0.7';
    
    if (isDashboardOpen) {
      closeDashboard();
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
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
        await window.electron.processJobInfo(filePath);
        showHint('Job analysis complete!', 2500);
      } else {
        showHint('Screenshot captured!', 2000);
        setTimeout(() => {
          openDashboard('screenshots');
        }, 800);
      }
    }
    
    setStatus('ready');
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    setStatus('error');
    showHint(`Error: ${error.message}`, 3000);
    setTimeout(() => setStatus('ready'), 3000);
  } finally {
    isProcessing = false;
    toolbar.style.transition = 'opacity 0.2s ease';
    toolbar.style.opacity = '1';
  }
}

function openScreenshotActions(screenshot) {
  const action = prompt(`${screenshot.name}\n\n1. View\n2. Analyze\n3. Delete\n\nEnter number (1-3):`);
  
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
    showHint('Analyzing screenshot...', 2000);
    await window.electron.analyzeJobScreenshot(id);
    setStatus('ready');
    showHint('Analysis complete!', 2000);
  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    setStatus('error');
    showHint('Analysis failed', 2000);
    setTimeout(() => setStatus('ready'), 2000);
  }
}

async function deleteScreenshot(id) {
  const confirmed = confirm('Delete this screenshot?');
  if (confirmed) {
    try {
      await window.electron.deleteScreenshot(id);
      loadScreenshots();
      showHint('Screenshot deleted', 2000);
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      showHint('Delete failed', 2000);
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
      loadScreenshots();
      showHint('All screenshots cleared', 2500);
    } catch (error) {
      console.error('Error clearing screenshots:', error);
      showHint('Clear failed', 2000);
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
  
  // Liquid status animations
  switch (status) {
    case 'ready':
      statusText.textContent = 'Ready';
      statusIndicator.style.background = '';
      statusText.style.transform = 'scale(1) translateZ(0)';
      break;
    case 'processing':
      statusText.textContent = 'Capturing...';
      statusText.style.transform = 'scale(1.05) translateZ(0)';
      break;
    case 'analyzing':
      statusText.textContent = 'Analyzing...';
      statusText.style.transform = 'scale(1.05) translateZ(0)';
      break;
    case 'error':
      statusText.textContent = 'Error';
      statusIndicator.style.background = 'linear-gradient(45deg, #ff4757, #ff6b7a)';
      statusText.style.transform = 'scale(1.1) translateZ(0)';
      // Shake animation for errors
      toolbar.style.animation = 'liquidShake 0.5s ease-in-out';
      setTimeout(() => {
        toolbar.style.animation = '';
      }, 500);
      break;
    case 'idle':
      statusText.textContent = 'Idle';
      statusText.style.transform = 'scale(0.95) translateZ(0)';
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
    case 'settings':
      showHint('Settings coming soon!', 2000);
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
  
  // Liquid bounce effect
  hintBubble.style.animation = 'liquidBounceIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
  
  hintTimeout = setTimeout(() => {
    hideHint();
  }, duration);
}

function hideHint() {
  hintBubble.style.animation = 'liquidBounceOut 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  setTimeout(() => {
    hintBubble.classList.remove('show');
    hintBubble.style.animation = '';
  }, 300);
}

function hideToolbar() {
  toolbar.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
  toolbar.style.transform = 'scale(0.8) translateY(-20px) translateZ(0)';
  toolbar.style.opacity = '0';
  
  setTimeout(() => {
    if (window.electron && window.electron.hideToolbar) {
      window.electron.hideToolbar();
    }
  }, 500);
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
    analyzeBtn.style.background = 'linear-gradient(135deg, rgba(0, 119, 181, 0.4), rgba(0, 119, 181, 0.2))';
    analyzeBtn.style.transform = 'scale(1.02) translateZ(0)';
    showHint('LinkedIn detected - perfect for job analysis!', 4000);
  } else if (context.site === 'indeed') {
    analyzeBtn.style.background = 'linear-gradient(135deg, rgba(45, 107, 248, 0.4), rgba(45, 107, 248, 0.2))';
    analyzeBtn.style.transform = 'scale(1.02) translateZ(0)';
    showHint('Indeed detected - great for capturing job details!', 4000);
  }
  
  // Reset after hint
  setTimeout(() => {
    analyzeBtn.style.background = '';
    analyzeBtn.style.transform = '';
  }, 4000);
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes liquidShake {
    0%, 100% { transform: translateX(0) translateZ(0); }
    25% { transform: translateX(-2px) translateZ(0); }
    75% { transform: translateX(2px) translateZ(0); }
  }
  
  @keyframes liquidBounceIn {
    0% { transform: translateX(-50%) scale(0.8) translateY(-8px); opacity: 0; }
    50% { transform: translateX(-50%) scale(1.05) translateY(-6px); opacity: 0.8; }
    100% { transform: translateX(-50%) scale(1) translateY(-3px); opacity: 1; }
  }
  
  @keyframes liquidBounceOut {
    0% { transform: translateX(-50%) scale(1) translateY(-3px); opacity: 1; }
    100% { transform: translateX(-50%) scale(0.9) translateY(-8px); opacity: 0; }
  }
  

`;
document.head.appendChild(style);

// Window focus/blur events with liquid transitions
window.addEventListener('focus', () => {
  setStatus(isProcessing ? 'processing' : 'ready');
  toolbar.style.filter = 'none';
});

window.addEventListener('blur', () => {
  if (!isProcessing) {
    setStatus('idle');
  }
  toolbar.style.filter = 'brightness(0.9)';
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