// DOM Elements
const screenshotsContainer = document.getElementById('screenshotsContainer');
const totalCountElement = document.getElementById('totalCount');
const todayCountElement = document.getElementById('todayCount');

// Listen for new screenshots
if (window.electron && window.electron.onScreenshotAdded) {
  window.electron.onScreenshotAdded((screenshot) => {
    loadScreenshots();
  });
}

// Load screenshots on page load
window.addEventListener('DOMContentLoaded', async () => {
  loadScreenshots();
  setupKeyboardShortcuts();
});

// Setup keyboard shortcuts for dashboard
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    
    switch (e.key.toLowerCase()) {
      case 'r':
        if (isCtrlOrCmd) {
          e.preventDefault();
          refreshScreenshots();
          showKeyboardHint('Screenshots refreshed');
        }
        break;
        
      case 'c':
        if (isCtrlOrCmd && e.shiftKey) {
          e.preventDefault();
          // Trigger capture (handled by global shortcut)
          showKeyboardHint('Capturing screenshot...');
        }
        break;
        
      case 'a':
        if (isCtrlOrCmd && e.shiftKey) {
          e.preventDefault();
          // Trigger analyze (handled by global shortcut)
          showKeyboardHint('Capturing and analyzing...');
        }
        break;
        
      case 't':
        if (isCtrlOrCmd && e.shiftKey) {
          e.preventDefault();
          window.electron.showTracker();
          showKeyboardHint('Opening tracker...');
        }
        break;
        
      case 'delete':
      case 'backspace':
        if (isCtrlOrCmd && e.shiftKey) {
          e.preventDefault();
          clearScreenshots();
        }
        break;
        
      case 'f5':
        e.preventDefault();
        refreshScreenshots();
        showKeyboardHint('Screenshots refreshed');
        break;
        
      case 'escape':
        // Close any open modals or return to main view
        hideKeyboardHint();
        break;
        
      case '?':
        if (e.shiftKey) { // Shift + ? = ?
          e.preventDefault();
          showKeyboardHelp();
        }
        break;
    }
  });
}

// Show keyboard shortcut hint
function showKeyboardHint(message) {
  // Remove existing hint
  const existingHint = document.querySelector('.keyboard-hint');
  if (existingHint) {
    existingHint.remove();
  }
  
  // Create new hint
  const hint = document.createElement('div');
  hint.className = 'keyboard-hint';
  hint.textContent = message;
  hint.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(hint);
  
  // Auto-remove after 2 seconds
  setTimeout(() => {
    if (hint.parentNode) {
      hint.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => hint.remove(), 300);
    }
  }, 2000);
}

// Hide keyboard hint
function hideKeyboardHint() {
  const hint = document.querySelector('.keyboard-hint');
  if (hint) {
    hint.remove();
  }
}

// Show keyboard help modal
function showKeyboardHelp() {
  // Remove existing help modal
  const existingModal = document.querySelector('.keyboard-help-modal');
  if (existingModal) {
    existingModal.remove();
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'keyboard-help-modal';
  modal.innerHTML = `
    <div class="keyboard-help-content">
      <h2>Keyboard Shortcuts</h2>
      <div class="shortcuts-grid">
        <div class="shortcut-section">
          <h3>Global Shortcuts</h3>
          <div class="shortcut-item">
            <span class="shortcut-key">Cmd/Ctrl + Shift + C</span>
            <span class="shortcut-desc">Quick Capture</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Cmd/Ctrl + Shift + A</span>
            <span class="shortcut-desc">Capture & Analyze</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Cmd/Ctrl + Shift + D</span>
            <span class="shortcut-desc">Open Dashboard</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Cmd/Ctrl + Shift + T</span>
            <span class="shortcut-desc">Open Tracker</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Cmd/Ctrl + Shift + H</span>
            <span class="shortcut-desc">Hide/Show Toolbar</span>
          </div>
        </div>
        <div class="shortcut-section">
          <h3>Dashboard Shortcuts</h3>
          <div class="shortcut-item">
            <span class="shortcut-key">Cmd/Ctrl + R</span>
            <span class="shortcut-desc">Refresh Screenshots</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">F5</span>
            <span class="shortcut-desc">Refresh Screenshots</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Cmd/Ctrl + Shift + Delete</span>
            <span class="shortcut-desc">Clear All Screenshots</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Escape</span>
            <span class="shortcut-desc">Close Modals</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Shift + ?</span>
            <span class="shortcut-desc">Show This Help</span>
          </div>
        </div>
        <div class="shortcut-section">
          <h3>Alternative Shortcuts</h3>
          <div class="shortcut-item">
            <span class="shortcut-key">F1</span>
            <span class="shortcut-desc">Quick Capture</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">F2</span>
            <span class="shortcut-desc">Capture & Analyze</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">F3</span>
            <span class="shortcut-desc">Open Dashboard</span>
          </div>
        </div>
      </div>
      <div class="help-footer">
        <button onclick="this.closest('.keyboard-help-modal').remove()">Close</button>
      </div>
    </div>
  `;
  
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
  
  document.body.appendChild(modal);
  
  // Close on click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Close on Escape key
  const closeOnEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', closeOnEscape);
    }
  };
  document.addEventListener('keydown', closeOnEscape);
}

// Refresh screenshots
function refreshScreenshots() {
  loadScreenshots();
}

// Clear all screenshots
async function clearScreenshots() {
  if (confirm('Are you sure you want to clear all screenshots? This action cannot be undone.')) {
    try {
      await window.electron.clearScreenshots();
      loadScreenshots();
    } catch (error) {
      console.error('Error clearing screenshots:', error);
      alert('Failed to clear screenshots');
    }
  }
}

// Load screenshots from database
async function loadScreenshots() {
  try {
    // Show loading state
    screenshotsContainer.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        Loading screenshots...
      </div>
    `;
    
    // Get screenshots from database
    const screenshots = await window.electron.getScreenshots();
    
    // Update stats
    updateStats(screenshots);
    
    // Clear loading state
    screenshotsContainer.innerHTML = '';
    
    // Check if there are any screenshots
    if (!screenshots || screenshots.length === 0) {
      screenshotsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📷</div>
          <div class="empty-title">No screenshots yet</div>
          <div class="empty-subtitle">Use the floating toolbar to capture your first screenshot</div>
        </div>
      `;
      return;
    }
    
    // Create screenshots grid
    const grid = document.createElement('div');
    grid.className = 'screenshots-grid';
    
    // Sort screenshots by timestamp (newest first)
    screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Create screenshot cards
    screenshots.forEach(screenshot => {
      const card = createScreenshotCard(screenshot);
      grid.appendChild(card);
    });
    
    screenshotsContainer.appendChild(grid);
    
  } catch (error) {
    console.error('Error loading screenshots:', error);
    screenshotsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Error loading screenshots</div>
        <div class="empty-subtitle">Please try refreshing the page</div>
      </div>
    `;
  }
}

// Update statistics
function updateStats(screenshots) {
  const total = screenshots.length;
  const today = screenshots.filter(s => {
    const screenshotDate = new Date(s.timestamp);
    const todayDate = new Date();
    return screenshotDate.toDateString() === todayDate.toDateString();
  }).length;
  
  totalCountElement.textContent = total;
  todayCountElement.textContent = today;
}

// Create screenshot card element
function createScreenshotCard(screenshot) {
  const card = document.createElement('div');
  card.className = 'screenshot-card';
  
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  card.innerHTML = `
    <div class="screenshot-preview">
      <img src="file://${screenshot.path}" alt="${screenshot.name}" onerror="this.style.display='none'">
    </div>
    <div class="screenshot-info">
      <div class="screenshot-name">${screenshot.name}</div>
      <div class="screenshot-date">${formatDate(screenshot.timestamp)}</div>
      <div class="screenshot-actions">
        <button class="screenshot-btn" onclick="openScreenshot('${screenshot.path}')">
          👁 View
        </button>
        <button class="screenshot-btn" onclick="analyzeScreenshot('${screenshot.path}')">
          🔍 Analyze
        </button>
        <button class="screenshot-btn danger" onclick="deleteScreenshot('${screenshot.id}')">
          🗑 Delete
        </button>
      </div>
    </div>
  `;
  
  return card;
}

// Open screenshot in default viewer
async function openScreenshot(path) {
  try {
    await window.electron.openFile(path);
  } catch (error) {
    console.error('Error opening screenshot:', error);
    alert('Failed to open screenshot');
  }
}

// Analyze screenshot
async function analyzeScreenshot(path) {
  try {
    await window.electron.processJobInfo(path);
  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    alert('Failed to analyze screenshot');
  }
}

// Delete screenshot
async function deleteScreenshot(id) {
  if (confirm('Are you sure you want to delete this screenshot?')) {
    try {
      await window.electron.deleteScreenshot(id);
      loadScreenshots();
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      alert('Failed to delete screenshot');
    }
  }
} 