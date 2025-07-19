// DOM Elements
const saveDirectoryElement = document.getElementById('saveDirectory');
const changeDirBtn = document.getElementById('changeDirBtn');
const screenshotList = document.getElementById('screenshotList');
const refreshBtn = document.getElementById('refreshBtn');

// Listen for settings events
window.electron.onShowSettings(() => {
  document.getElementById('settingsSection').scrollIntoView({ behavior: 'smooth' });
});

// Listen for new screenshots
window.electron.onScreenshotAdded((screenshot) => {
  loadScreenshots();
});

// Load settings on page load
window.addEventListener('DOMContentLoaded', async () => {
  // Get settings
  const settings = await window.electron.getSettings();
  saveDirectoryElement.textContent = settings.saveDirectory;
  
  // Set up event listeners
  changeDirBtn.addEventListener('click', async () => {
    const newDirectory = await window.electron.setSaveDirectory();
    saveDirectoryElement.textContent = newDirectory;
  });
  
  refreshBtn.addEventListener('click', () => {
    loadScreenshots();
  });
  
  // Load screenshots
  loadScreenshots();
});

// Load screenshots from database
async function loadScreenshots() {
  try {
    // Show loading state
    screenshotList.innerHTML = '<div class="loading">Loading screenshots...</div>';
    
    // Get screenshots from database
    const screenshots = await window.electron.getScreenshots();
    
    // Clear loading state
    screenshotList.innerHTML = '';
    
    // Check if there are any screenshots
    if (!screenshots || screenshots.length === 0) {
      screenshotList.innerHTML = `
        <div class="empty-state">
          <p>No screenshots yet. Capture one using the toolbar!</p>
        </div>
      `;
      return;
    }
    
    // Create screenshot items
    screenshots.forEach(screenshot => {
      const screenshotItem = document.createElement('div');
      screenshotItem.className = 'screenshot-item';
      
      // Format date
      const date = new Date(screenshot.timestamp);
      const formattedDate = date.toLocaleString();
      
      // Create HTML for screenshot item
      screenshotItem.innerHTML = `
        <div class="img-container">
          <img src="file://${screenshot.thumbnailPath}" alt="${screenshot.name}" data-id="${screenshot.id}">
        </div>
        <div class="info">
          <div class="title">${screenshot.name}</div>
          <div class="date">${formattedDate}</div>
          <div class="actions">
            <div class="action-buttons">
              <button class="open" data-id="${screenshot.id}">Open</button>
              <button class="analyze" data-id="${screenshot.id}">Analyze Job</button>
            </div>
            <button class="delete" data-id="${screenshot.id}">Delete</button>
          </div>
        </div>
      `;
      
      // Add event listeners
      const img = screenshotItem.querySelector('img');
      img.addEventListener('click', () => {
        window.electron.openScreenshot(screenshot.id);
      });
      
      const openBtn = screenshotItem.querySelector('button.open');
      openBtn.addEventListener('click', () => {
        window.electron.openScreenshot(screenshot.id);
      });
      
      const analyzeBtn = screenshotItem.querySelector('button.analyze');
      analyzeBtn.addEventListener('click', async () => {
        analyzeBtn.textContent = 'Analyzing...';
        analyzeBtn.disabled = true;
        
        try {
          await window.electron.analyzeJobScreenshot(screenshot.id);
        } catch (error) {
          console.error('Error analyzing job screenshot:', error);
          alert('Error analyzing job information. Please try again.');
        } finally {
          analyzeBtn.textContent = 'Analyze Job';
          analyzeBtn.disabled = false;
        }
      });
      
      const deleteBtn = screenshotItem.querySelector('button.delete');
      deleteBtn.addEventListener('click', async () => {
        const confirmed = confirm(`Are you sure you want to delete "${screenshot.name}"?`);
        if (confirmed) {
          await window.electron.deleteScreenshot(screenshot.id);
          loadScreenshots();
        }
      });
      
      // Add to list
      screenshotList.appendChild(screenshotItem);
    });
  } catch (error) {
    console.error('Error loading screenshots:', error);
    screenshotList.innerHTML = `
      <div class="empty-state">
        <p>Error loading screenshots. Please try again.</p>
      </div>
    `;
  }
} 