// DOM Elements
const toolbar = document.getElementById('toolbar');
const captureBtn = document.getElementById('captureBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const contextMenu = document.getElementById('contextMenu');
const hintBubble = document.getElementById('hintBubble');

// State management
let currentStatus = 'ready';
let isProcessing = false;
let fadeTimeout = null;
let hintTimeout = null;
let contextDetection = null;

// Initialize toolbar
document.addEventListener('DOMContentLoaded', () => {
  initializeToolbar();
  setupEventListeners();
  startContextDetection();
});

function initializeToolbar() {
  setStatus('ready');
  setupDragBehavior();
  setupKeyboardShortcuts();
  setupAutoFade();
}

function setupEventListeners() {
  // Button clicks
  captureBtn.addEventListener('click', () => handleCapture(false));
  analyzeBtn.addEventListener('click', () => handleCapture(true));
  
  // Context menu
  toolbar.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', hideContextMenu);
  
  // Context menu items
  contextMenu.addEventListener('click', handleContextMenuClick);
  
  // Hover effects for hints
  captureBtn.addEventListener('mouseenter', () => showHint('Capture screenshot and open dashboard'));
  analyzeBtn.addEventListener('mouseenter', () => showHint('Capture and analyze job posting'));
  captureBtn.addEventListener('mouseleave', hideHint);
  analyzeBtn.addEventListener('mouseleave', hideHint);
  
  // Keyboard navigation
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

function setupDragBehavior() {
  let isDragging = false;
  let startX, startY, initialX, initialY;
  
  toolbar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.action-btn') || e.target.closest('.context-menu')) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = toolbar.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    toolbar.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    toolbar.style.left = `${initialX + deltaX}px`;
    toolbar.style.top = `${initialY + deltaY}px`;
    toolbar.style.position = 'fixed';
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      toolbar.style.cursor = 'move';
      
      // Save position
      const rect = toolbar.getBoundingClientRect();
      if (window.electron && window.electron.saveToolbarPosition) {
        window.electron.saveToolbarPosition(rect.left, rect.top);
      }
    }
  });
}

function setupAutoFade() {
  // Auto-fade when inactive
  function startFadeTimer() {
    clearTimeout(fadeTimeout);
    fadeTimeout = setTimeout(() => {
      if (!isProcessing && !contextMenu.classList.contains('active')) {
        toolbar.style.opacity = '0.6';
      }
    }, 3000);
  }
  
  function cancelFadeTimer() {
    clearTimeout(fadeTimeout);
    toolbar.style.opacity = '0.85';
  }
  
  toolbar.addEventListener('mouseenter', cancelFadeTimer);
  toolbar.addEventListener('mouseleave', startFadeTimer);
  toolbar.addEventListener('focus', cancelFadeTimer, true);
  toolbar.addEventListener('blur', startFadeTimer, true);
  
  // Start initial timer
  startFadeTimer();
}

function setupKeyboardShortcuts() {
  // Listen for global shortcuts from main process
  if (window.electron && window.electron.onGlobalShortcut) {
    window.electron.onGlobalShortcut(() => handleCapture(false));
  }
  
  if (window.electron && window.electron.onAnalyzeShortcut) {
    window.electron.onAnalyzeShortcut(() => handleCapture(true));
  }
}

function handleKeyboardShortcuts(e) {
  // Local keyboard shortcuts
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
      case 'h':
        e.preventDefault();
        hideToolbar();
        break;
    }
  }
  
  // Escape to hide context menu
  if (e.key === 'Escape') {
    hideContextMenu();
  }
}

async function handleCapture(shouldAnalyze = false) {
  if (isProcessing) return;
  
  try {
    setStatus('processing');
    isProcessing = true;
    
    // Hide toolbar during capture
    toolbar.style.opacity = '0';
    
    // Wait for toolbar to fade
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get screen sources
    const sources = await window.electron.captureScreenshot();
    
    if (!sources || sources.length === 0) {
      throw new Error('No screen sources available');
    }
    
    // Process screenshot
    const primarySource = sources[0];
    if (primarySource.thumbnail) {
      const dataURL = primarySource.thumbnail.toDataURL();
      const filePath = await window.electron.saveScreenshot(dataURL);
      
      if (shouldAnalyze && filePath) {
        setStatus('analyzing');
        await window.electron.processJobInfo(filePath);
        showHint('Job analysis complete!');
      } else {
        // Show dashboard after capture
        window.electron.showDashboard();
        showHint('Screenshot saved to dashboard');
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
    toolbar.style.opacity = '0.85';
  }
}

function setStatus(status) {
  currentStatus = status;
  statusIndicator.className = `smart-indicator ${status}`;
  
  switch (status) {
    case 'ready':
      statusText.textContent = 'Ready';
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
    case 'dashboard':
      window.electron.showDashboard();
      break;
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
  
  // Check for job sites every 5 seconds
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

// Listen for window focus/blur events
window.addEventListener('focus', () => {
  setStatus(isProcessing ? 'processing' : 'ready');
});

window.addEventListener('blur', () => {
  if (!isProcessing) {
    setStatus('idle');
  }
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (contextDetection) {
    clearInterval(contextDetection);
  }
  clearTimeout(fadeTimeout);
  clearTimeout(hintTimeout);
}); 