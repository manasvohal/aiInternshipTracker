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
});

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