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

// State management
let currentStatus = 'ready';
let isProcessing = false;
let fadeTimeout = null;
let hintTimeout = null;
let contextDetection = null;
let isDashboardOpen = false;

// Initialize toolbar
document.addEventListener('DOMContentLoaded', () => {
  initializeToolbar();
  setupEventListeners();
  startContextDetection();
  loadDashboardScreenshots();
  
  // Test dashboard functionality on load
  console.log('Dashboard elements found:', {
    dropdown: !!dashboardDropdown,
    toggle: !!dashboardToggle,
    grid: !!screenshotGrid
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
  
  // Dashboard actions
  if (refreshDashboard) {
    refreshDashboard.addEventListener('click', (e) => {
      e.stopPropagation();
      loadDashboardScreenshots();
      showHint('Dashboard refreshed');
    });
  }
  
  if (clearAll) {
    clearAll.addEventListener('click', (e) => {
      e.stopPropagation();
      clearAllScreenshots();
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
        await window.electron.processJobInfo(filePath);
        showHint('Job analysis complete!');
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
  dashboardDropdown.style.maxHeight = '300px'; // Compact design height
  dashboardDropdown.style.opacity = '1';
  
  // Resize window to accommodate compact dashboard
  if (window.electron && window.electron.resizeWindow) {
    window.electron.resizeWindow(400, 365); // Compact total height
  }
  
  loadDashboardScreenshots();
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