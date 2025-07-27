// screenshot-tool/services/emailIntegration.js
const { GmailScanner } = require('./emailService');
const Store = require('electron-store');
const { dialog, BrowserWindow } = require('electron');

// Store for email-related data
const emailDataStore = new Store({ name: 'email-data' });

class EmailIntegration {
  constructor(electronApp, internshipStore) {
    this.app = electronApp;
    this.internshipStore = internshipStore;
    this.gmailScanner = new GmailScanner();
    this.isScanning = false;
    this.lastScanTime = emailDataStore.get('lastScanTime');
    this.scanResults = emailDataStore.get('scanResults', []);
    this.progressWindow = null;
    
    // Auto-scan settings
    this.autoScanEnabled = emailDataStore.get('autoScanEnabled', false);
    this.scanInterval = emailDataStore.get('scanInterval', 24); // hours
    this.autoScanTimer = null;
    
    this.setupAutoScan();
  }

  // Initialize email integration
  async initialize() {
    try {
      console.log('🚀 Initializing email integration...');
      
      // Check if gmailScanner exists and has initialize method
      if (!this.gmailScanner || typeof this.gmailScanner.initialize !== 'function') {
        console.error('❌ GmailScanner not properly initialized');
        return { success: false, error: 'GmailScanner not available' };
      }
      
      const result = await this.gmailScanner.initialize();
      
      if (result.success) {
        console.log('✅ Gmail already authenticated');
        return { success: true, authenticated: true };
      } else if (result.needsSetup) {
        console.log('⚠️ Gmail setup required');
        return { success: false, needsSetup: true };
      } else if (result.needsAuth) {
        console.log('⚠️ Gmail authentication required');
        return { success: false, needsAuth: true };
      }
      
      return result;
    } catch (error) {
      console.error('❌ Email integration initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Setup Gmail credentials with user-friendly dialog
  async setupGmailCredentials() {
    try {
      const setupDialog = await this.showCredentialsDialog();
      
      if (setupDialog.success && setupDialog.credentials) {
        const result = this.gmailScanner.setupCredentials(
          setupDialog.credentials.clientId,
          setupDialog.credentials.clientSecret
        );
        
        if (result.success) {
          return { success: true, message: 'Credentials saved successfully!' };
        } else {
          return { success: false, error: result.error };
        }
      }
      
      return { success: false, cancelled: true };
    } catch (error) {
      console.error('❌ Credential setup failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Show credentials setup dialog
  async showCredentialsDialog() {
    return new Promise((resolve) => {
      // Create a simple HTML dialog for credential input
      const credentialsWindow = new BrowserWindow({
        width: 600,
        height: 700,
        modal: true,
        parent: BrowserWindow.getFocusedWindow(),
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        },
        title: 'Gmail API Setup',
        resizable: false
      });

      const dialogHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Gmail Setup</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-bottom: 20px; }
    .step { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; }
    .step h3 { margin: 0 0 10px 0; color: #007bff; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    button { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
    .btn-primary { background: #007bff; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-link { background: none; color: #007bff; text-decoration: underline; }
    .actions { margin-top: 20px; }
    .error { color: #dc3545; font-size: 14px; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📧 Gmail API Setup</h1>
    
    <div class="step">
      <h3>Step 1: Create Google Cloud Project</h3>
      <p>1. Go to <a href="#" onclick="openLink('https://console.cloud.google.com')">Google Cloud Console</a></p>
      <p>2. Create a new project or select existing one</p>
      <p>3. Enable the Gmail API in "APIs & Services" → "Library"</p>
    </div>
    
    <div class="step">
      <h3>Step 2: Create OAuth2 Credentials</h3>
      <p>1. Go to "APIs & Services" → "Credentials"</p>
      <p>2. Click "Create Credentials" → "OAuth 2.0 Client IDs"</p>
      <p>3. Choose "Desktop application"</p>
      <p>4. Download the credentials JSON file</p>
    </div>
    
    <div class="step">
      <h3>Step 3: Enter Your Credentials</h3>
      <div class="form-group">
        <label for="clientId">Client ID:</label>
        <input type="text" id="clientId" placeholder="your-client-id.googleusercontent.com">
        <div class="error" id="clientIdError"></div>
      </div>
      
      <div class="form-group">
        <label for="clientSecret">Client Secret:</label>
        <input type="password" id="clientSecret" placeholder="Your client secret">
        <div class="error" id="clientSecretError"></div>
      </div>
    </div>
    
    <div class="actions">
      <button class="btn-primary" onclick="saveCredentials()">Save & Continue</button>
      <button class="btn-secondary" onclick="cancel()">Cancel</button>
      <button class="btn-link" onclick="openInstructions()">Detailed Instructions</button>
    </div>
  </div>

  <script>
    const { shell } = require('electron');
    const { ipcRenderer } = require('electron');

    function openLink(url) {
      shell.openExternal(url);
    }

    function openInstructions() {
      shell.openExternal('https://developers.google.com/gmail/api/quickstart/nodejs');
    }

    function validateInputs() {
      const clientId = document.getElementById('clientId').value.trim();
      const clientSecret = document.getElementById('clientSecret').value.trim();
      
      let valid = true;
      
      // Clear previous errors
      document.getElementById('clientIdError').textContent = '';
      document.getElementById('clientSecretError').textContent = '';
      
      if (!clientId) {
        document.getElementById('clientIdError').textContent = 'Client ID is required';
        valid = false;
      } else if (!clientId.includes('.googleusercontent.com')) {
        document.getElementById('clientIdError').textContent = 'Invalid Client ID format';
        valid = false;
      }
      
      if (!clientSecret) {
        document.getElementById('clientSecretError').textContent = 'Client Secret is required';
        valid = false;
      } else if (clientSecret.length < 10) {
        document.getElementById('clientSecretError').textContent = 'Client Secret seems too short';
        valid = false;
      }
      
      return { valid, clientId, clientSecret };
    }

    function saveCredentials() {
      const validation = validateInputs();
      
      if (validation.valid) {
        ipcRenderer.send('credentials-saved', {
          success: true,
          credentials: {
            clientId: validation.clientId,
            clientSecret: validation.clientSecret
          }
        });
      }
    }

    function cancel() {
      ipcRenderer.send('credentials-saved', { success: false, cancelled: true });
    }

    // Handle Enter key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        saveCredentials();
      } else if (e.key === 'Escape') {
        cancel();
      }
    });
  </script>
</body>
</html>`;

      credentialsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(dialogHTML)}`);

      credentialsWindow.webContents.once('ipc-message', (event, channel, data) => {
        if (channel === 'credentials-saved') {
          credentialsWindow.close();
          resolve(data);
        }
      });

      credentialsWindow.on('closed', () => {
        resolve({ success: false, cancelled: true });
      });
    });
  }

  // Start Gmail authentication flow
  async startGmailAuth() {
    try {
      const result = await this.gmailScanner.startAuthFlow();
      
      if (result.success) {
        // Show authorization code input dialog
        const authCode = await this.showAuthCodeDialog();
        
        if (authCode) {
          const authResult = await this.gmailScanner.completeAuth(authCode);
          
          if (authResult.success) {
            this.showSuccessDialog('Gmail Connected!', 
              `Successfully connected to ${authResult.email}\n\nYou can now scan emails for internship applications.`);
            return { success: true, email: authResult.email };
          } else {
            this.showErrorDialog('Authentication Failed', authResult.error);
            return { success: false, error: authResult.error };
          }
        }
      } else {
        this.showErrorDialog('Setup Failed', result.error);
        return { success: false, error: result.error };
      }
      
      return { success: false, cancelled: true };
    } catch (error) {
      console.error('❌ Gmail auth failed:', error);
      this.showErrorDialog('Authentication Error', error.message);
      return { success: false, error: error.message };
    }
  }

  // Show authorization code input dialog
  async showAuthCodeDialog() {
    return new Promise((resolve) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Gmail Authorization',
        message: 'Browser opened for Gmail authorization',
        detail: 'After authorizing in your browser, you\'ll get an authorization code. Please copy and paste it below.',
        buttons: ['Continue', 'Cancel']
      }).then(result => {
        if (result.response === 0) {
          // Show input dialog - in a real app you'd create a proper dialog
          // For now, we'll use a simple prompt approach
          this.showAuthCodeInputDialog().then(resolve);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Simple auth code input (replace with proper dialog in production)
  async showAuthCodeInputDialog() {
    return new Promise((resolve) => {
      const inputWindow = new BrowserWindow({
        width: 500,
        height: 300,
        modal: true,
        parent: BrowserWindow.getFocusedWindow(),
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        },
        title: 'Enter Authorization Code'
      });

      const inputHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Code</title>
  <style>
    body { font-family: system-ui; padding: 30px; background: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 8px; }
    h2 { margin: 0 0 20px 0; }
    textarea { width: 100%; height: 80px; margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    button { padding: 10px 20px; margin-right: 10px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-primary { background: #007bff; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Enter Authorization Code</h2>
    <p>Paste the authorization code from Google here:</p>
    <textarea id="authCode" placeholder="Paste authorization code here..."></textarea>
    <div>
      <button class="btn-primary" onclick="submit()">Submit</button>
      <button class="btn-secondary" onclick="cancel()">Cancel</button>
    </div>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    
    function submit() {
      const code = document.getElementById('authCode').value.trim();
      if (code) {
        ipcRenderer.send('auth-code-entered', code);
      } else {
        alert('Please enter the authorization code');
      }
    }
    
    function cancel() {
      ipcRenderer.send('auth-code-entered', null);
    }
    
    document.getElementById('authCode').focus();
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.ctrlKey) {
        submit();
      } else if (e.key === 'Escape') {
        cancel();
      }
    });
  </script>
</body>
</html>`;

      inputWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(inputHTML)}`);

      inputWindow.webContents.once('ipc-message', (event, channel, data) => {
        if (channel === 'auth-code-entered') {
          inputWindow.close();
          resolve(data);
        }
      });

      inputWindow.on('closed', () => {
        resolve(null);
      });
    });
  }

  // Quick scan with progress dialog
  async quickScan(options = {}) {
    return this.scanEmails({
      maxResults: 25,
      daysBack: 7,
      ...options
    });
  }

  // Deep scan with progress dialog
  async deepScan(options = {}) {
    const confirmed = await this.confirmDeepScan();
    if (!confirmed) return [];

    return this.scanEmails({
      maxResults: 100,
      daysBack: 180,
      ...options
    });
  }

  // Main email scanning method with progress UI
  async scanEmails(options = {}) {
    if (this.isScanning) {
      this.showErrorDialog('Scan in Progress', 'An email scan is already running. Please wait for it to complete.');
      return [];
    }

    if (!this.gmailScanner.isGmailAuthenticated()) {
      this.showErrorDialog('Not Authenticated', 'Please authenticate with Gmail first.');
      return [];
    }

    try {
      this.isScanning = true;
      
      // Show progress window
      this.showProgressWindow();
      
      const results = await this.gmailScanner.scanForInternships(options, (message, progress) => {
        this.updateProgress(message, progress);
      });
      
      // Process results
      const processedResults = await this.processEmailResults(results);
      
      // Store results
      this.scanResults = processedResults;
      this.lastScanTime = new Date().toISOString();
      
      emailDataStore.set('scanResults', this.scanResults);
      emailDataStore.set('lastScanTime', this.lastScanTime);

      // Close progress window
      this.closeProgressWindow();
      
      // Show results
      this.showScanResults(processedResults);
      
      return processedResults;

    } catch (error) {
      console.error('❌ Email scan failed:', error);
      this.closeProgressWindow();
      this.showErrorDialog('Scan Failed', error.message);
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  // Show progress window
  showProgressWindow() {
    if (this.progressWindow) return;

    this.progressWindow = new BrowserWindow({
      width: 400,
      height: 200,
      modal: true,
      parent: BrowserWindow.getFocusedWindow(),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      title: 'Scanning Emails',
      resizable: false,
      minimizable: false,
      maximizable: false
    });

    const progressHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Email Scan</title>
  <style>
    body { font-family: system-ui; padding: 30px; margin: 0; background: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 8px; text-align: center; }
    .progress-bar { width: 100%; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden; margin: 20px 0; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #007bff, #28a745); transition: width 0.3s ease; }
    .status { margin: 10px 0; color: #666; }
    .percentage { font-weight: bold; color: #007bff; }
    button { padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <h3>📧 Scanning Emails for Internships</h3>
    <div class="progress-bar">
      <div class="progress-fill" id="progressFill" style="width: 0%"></div>
    </div>
    <div class="status" id="statusText">Starting scan...</div>
    <div class="percentage" id="percentageText">0%</div>
    <button onclick="cancel()" id="cancelBtn">Cancel</button>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    
    function cancel() {
      ipcRenderer.send('cancel-scan');
    }
    
    ipcRenderer.on('progress-update', (event, message, progress) => {
      document.getElementById('statusText').textContent = message;
      document.getElementById('percentageText').textContent = Math.round(progress) + '%';
      document.getElementById('progressFill').style.width = progress + '%';
    });
  </script>
</body>
</html>`;

    this.progressWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(progressHTML)}`);

    this.progressWindow.webContents.once('ipc-message', (event, channel) => {
      if (channel === 'cancel-scan') {
        this.isScanning = false;
        this.closeProgressWindow();
      }
    });

    this.progressWindow.on('closed', () => {
      this.progressWindow = null;
    });
  }

  // Update progress
  updateProgress(message, progress) {
    if (this.progressWindow && !this.progressWindow.isDestroyed()) {
      this.progressWindow.webContents.send('progress-update', message, progress);
    }
  }

  // Close progress window
  closeProgressWindow() {
    if (this.progressWindow && !this.progressWindow.isDestroyed()) {
      this.progressWindow.close();
    }
    this.progressWindow = null;
  }

  // Process email results and check for duplicates
  async processEmailResults(emails) {
    const processed = [];
    const existing = this.internshipStore.get('internships') || [];
    
    for (const email of emails) {
      const extractedData = email.analysis.extractedData;
      
      // Check for duplicates
      const duplicate = existing.find(internship => 
        this.isSimilarApplication(internship, extractedData, email)
      );

      if (!duplicate) {
        // Create new internship entry
        const internshipEntry = {
          id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          companyName: extractedData.company,
          jobTitle: extractedData.position || 'Position',
          location: extractedData.location || 'Not specified',
          status: extractedData.status,
          addedAt: email.date.toISOString(),
          source: 'email',
          emailId: email.id,
          emailSubject: email.subject,
          emailFrom: email.from,
          emailDate: email.date.toISOString(),
          notes: `Auto-detected from email: ${email.subject}\n${extractedData.notes}`,
          confidence: email.analysis.details.confidence,
          autoDetected: true
        };

        processed.push({
          email,
          internship: internshipEntry,
          isNew: true
        });
      } else {
        processed.push({
          email,
          internship: duplicate,
          isNew: false,
          existingId: duplicate.id
        });
      }
    }

    return processed;
  }

  // Check if applications are similar (to avoid duplicates)
  isSimilarApplication(existing, extracted, email) {
    const companyMatch = existing.companyName?.toLowerCase() === extracted.company?.toLowerCase();
    const positionMatch = existing.jobTitle?.toLowerCase().includes(extracted.position?.toLowerCase()) ||
                         extracted.position?.toLowerCase().includes(existing.jobTitle?.toLowerCase());
    
    // Also check if we already have an email from the same thread
    const emailMatch = existing.emailId === email.id || existing.emailSubject === email.subject;
    
    return (companyMatch && positionMatch) || emailMatch;
  }

  // Show scan results dialog
  showScanResults(results) {
    const newCount = results.filter(r => r.isNew).length;
    const totalCount = results.length;
    
    if (totalCount === 0) {
      this.showInfoDialog('No Results', 'No internship emails found in the specified time range.\n\nTry expanding the search period or check if you have internship emails in your Gmail.');
      return;
    }

    const message = `Scan completed successfully!\n\nFound ${totalCount} internship-related emails\n${newCount} new applications detected\n\nWould you like to add the new applications to your tracker?`;

    dialog.showMessageBox({
      type: 'question',
      title: 'Scan Results',
      message: 'Email Scan Complete',
      detail: message,
      buttons: ['Add All New', 'Review Each', 'Skip', 'View Details'],
      defaultId: 0
    }).then(result => {
      switch (result.response) {
        case 0:
          this.addAllNewApplications(results);
          break;
        case 1:
          this.reviewApplications(results);
          break;
        case 2:
          // Skip - do nothing
          break;
        case 3:
          this.showDetailedResults(results);
          break;
      }
    });
  }

  // Add all new applications automatically
  async addAllNewApplications(results) {
    const newResults = results.filter(r => r.isNew);
    
    if (newResults.length === 0) {
      this.showInfoDialog('No New Applications', 'All found applications are already in your tracker.');
      return;
    }

    try {
      const internships = this.internshipStore.get('internships') || [];
      
      for (const item of newResults) {
        internships.unshift(item.internship);
      }
      
      this.internshipStore.set('internships', internships);
      this.notifyInternshipUpdates();
      
      this.showSuccessDialog('Applications Added', 
        `Successfully added ${newResults.length} new internship applications to your tracker!`);
      
    } catch (error) {
      console.error('❌ Failed to add applications:', error);
      this.showErrorDialog('Add Failed', `Failed to add applications: ${error.message}`);
    }
  }

  // Review applications one by one
  async reviewApplications(results) {
    const newResults = results.filter(r => r.isNew);
    
    if (newResults.length === 0) {
      this.showInfoDialog('No New Applications', 'All found applications are already in your tracker.');
      return;
    }

    let added = 0;
    
    for (const item of newResults) {
      const shouldAdd = await this.confirmAddApplication(item);
      
      if (shouldAdd === 'stop') break;
      if (shouldAdd === 'addAll') {
        // Add remaining applications
        const remaining = newResults.slice(newResults.indexOf(item));
        await this.addApplicationsBatch(remaining);
        added += remaining.length;
        break;
      }
      if (shouldAdd === true) {
        await this.addSingleApplication(item);
        added++;
      }
    }
    
    if (added > 0) {
      this.showSuccessDialog('Review Complete', `Added ${added} applications to your tracker.`);
    }
  }

  // Confirm adding individual application
  async confirmAddApplication(item) {
    const { internship, email } = item;
    
    return new Promise((resolve) => {
      dialog.showMessageBox({
        type: 'question',
        title: 'Add Application?',
        message: `${internship.companyName} - ${internship.jobTitle}`,
        detail: `Location: ${internship.location}\nStatus: ${internship.status}\nConfidence: ${internship.confidence}%\n\nEmail: ${email.subject}\nFrom: ${email.from}\nDate: ${email.date.toLocaleDateString()}\n\nAdd this application to your tracker?`,
        buttons: ['Add', 'Skip', 'Add All Remaining', 'Stop Review'],
        defaultId: 0
      }).then(result => {
        switch (result.response) {
          case 0: resolve(true); break;
          case 1: resolve(false); break;
          case 2: resolve('addAll'); break;
          case 3: resolve('stop'); break;
          default: resolve(false);
        }
      });
    });
  }

  // Add single application
  async addSingleApplication(item) {
    try {
      const internships = this.internshipStore.get('internships') || [];
      internships.unshift(item.internship);
      this.internshipStore.set('internships', internships);
      this.notifyInternshipUpdates();
    } catch (error) {
      console.error('❌ Failed to add application:', error);
    }
  }

  // Add applications in batch
  async addApplicationsBatch(items) {
    try {
      const internships = this.internshipStore.get('internships') || [];
      
      for (const item of items) {
        internships.unshift(item.internship);
      }
      
      this.internshipStore.set('internships', internships);
      this.notifyInternshipUpdates();
    } catch (error) {
      console.error('❌ Failed to add applications batch:', error);
    }
  }

  // Utility dialog methods
  showSuccessDialog(title, message) {
    dialog.showMessageBox({
      type: 'info',
      title: title,
      message: title,
      detail: message,
      buttons: ['OK']
    });
  }

  showErrorDialog(title, message) {
    dialog.showMessageBox({
      type: 'error',
      title: title,
      message: title,
      detail: message,
      buttons: ['OK']
    });
  }

  showInfoDialog(title, message) {
    dialog.showMessageBox({
      type: 'info',
      title: title,
      message: title,
      detail: message,
      buttons: ['OK']
    });
  }

  async confirmDeepScan() {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Deep Scan',
      message: 'Deep Email Scan',
      detail: 'This will scan the last 6 months of emails and may take several minutes.\n\nThis uses more Gmail API quota and may be slower.\n\nContinue with deep scan?',
      buttons: ['Yes, Deep Scan', 'No, Cancel'],
      defaultId: 0
    });
    
    return result.response === 0;
  }

  // Auto-scan functionality
  setupAutoScan() {
    if (this.autoScanEnabled) {
      this.startAutoScan();
    }
  }

  startAutoScan() {
    if (this.autoScanTimer) {
      clearInterval(this.autoScanTimer);
    }

    const intervalMs = this.scanInterval * 60 * 60 * 1000;
    
    this.autoScanTimer = setInterval(async () => {
      try {
        console.log('⏰ Running automatic email scan...');
        await this.quickScan();
      } catch (error) {
        console.error('❌ Auto-scan failed:', error);
      }
    }, intervalMs);

    console.log(`✅ Auto-scan enabled: every ${this.scanInterval} hours`);
  }

  stopAutoScan() {
    if (this.autoScanTimer) {
      clearInterval(this.autoScanTimer);
      this.autoScanTimer = null;
    }
  }

  configureAutoScan(enabled, intervalHours = 24) {
    this.autoScanEnabled = enabled;
    this.scanInterval = intervalHours;
    
    emailDataStore.set('autoScanEnabled', enabled);
    emailDataStore.set('scanInterval', intervalHours);

    if (enabled) {
      this.startAutoScan();
    } else {
      this.stopAutoScan();
    }
  }

  // Status and data methods
  getAuthStatus() {
    return this.gmailScanner.getConnectionStatus();
  }

  async testConnection() {
    return await this.gmailScanner.testConnection();
  }

  getScanStats() {
    const results = this.scanResults;
    const totalEmails = results.length;
    const newApplications = results.filter(r => r.isNew).length;
    
    return {
      lastScanTime: this.lastScanTime,
      totalEmailsFound: totalEmails,
      newApplications,
      autoScanEnabled: this.autoScanEnabled,
      scanInterval: this.scanInterval,
      isAuthenticated: this.gmailScanner.isGmailAuthenticated()
    };
  }

  getRecentResults(limit = 20) {
    return this.scanResults.slice(0, limit);
  }

  clearScanResults() {
    this.scanResults = [];
    emailDataStore.delete('scanResults');
    emailDataStore.delete('lastScanTime');
    this.lastScanTime = null;
  }

  async revokeGmailAccess() {
    try {
      await this.gmailScanner.revokeAuth();
      this.stopAutoScan();
      this.clearScanResults();
      return { success: true };
    } catch (error) {
      console.error('❌ Error revoking access:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify other windows of updates
  notifyInternshipUpdates() {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (window.webContents && !window.isDestroyed()) {
        window.webContents.send('internships-updated');
      }
    });
  }
}

module.exports = { EmailIntegration };