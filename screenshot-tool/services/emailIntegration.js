// screenshot-tool/services/emailIntegration.js
const { GmailScanner } = require('./emailService');
const Store = require('electron-store');
const { dialog } = require('electron');

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
      
      const authResult = await this.gmailScanner.setupAuth();
      if (authResult) {
        console.log('✅ Gmail already authenticated');
        await this.testConnection();
        return true;
      } else {
        console.log('⚠️ Gmail authentication required');
        return false;
      }
    } catch (error) {
      console.error('❌ Email integration initialization failed:', error);
      return false;
    }
  }

  // Setup Gmail authentication flow
  async setupGmailAuth() {
    try {
      // Check if credentials are already stored
      const credentials = this.gmailScanner.getStoredCredentials();
      
      if (!credentials) {
        // Show setup dialog
        const result = await dialog.showMessageBox({
          type: 'question',
          title: 'Gmail Setup Required',
          message: 'To scan emails for internship applications, you need to set up Gmail API access.\n\nWould you like to set this up now?',
          detail: 'You\'ll need to:\n1. Create a Google Cloud project\n2. Enable Gmail API\n3. Create OAuth2 credentials\n4. Add your credentials to the app',
          buttons: ['Set Up Now', 'Maybe Later', 'Learn More'],
          defaultId: 0
        });

        if (result.response === 0) {
          return await this.showCredentialsSetup();
        } else if (result.response === 2) {
          this.showSetupInstructions();
        }
        
        return false;
      }

      // Get auth URL and show to user
      const authUrl = this.gmailScanner.getAuthUrl();
      
      const authResult = await dialog.showMessageBox({
        type: 'info',
        title: 'Gmail Authorization',
        message: 'Please authorize the app to access your Gmail.',
        detail: 'A browser window will open. After authorizing, copy the authorization code and paste it in the next dialog.',
        buttons: ['Open Browser', 'Cancel'],
        defaultId: 0
      });

      if (authResult.response === 0) {
        // Open browser with auth URL
        require('electron').shell.openExternal(authUrl);
        
        // Prompt for auth code
        const authCode = await this.promptForAuthCode();
        if (authCode) {
          const success = await this.gmailScanner.completeAuth(authCode);
          if (success) {
            await this.testConnection();
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Gmail auth setup failed:', error);
      dialog.showErrorBox('Setup Failed', `Gmail setup failed: ${error.message}`);
      return false;
    }
  }

  // Show credentials setup dialog
  async showCredentialsSetup() {
    // This would show a custom dialog for entering OAuth2 credentials
    // For now, we'll use a simple input dialog
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'Gmail API Setup',
      message: 'Please visit the setup instructions and then add your credentials.',
      detail: 'You need to:\n1. Go to Google Cloud Console\n2. Create a new project or select existing\n3. Enable Gmail API\n4. Create OAuth2 credentials\n5. Add credentials to the app',
      buttons: ['Open Instructions', 'I Have Credentials', 'Cancel'],
      defaultId: 0
    });

    if (response === 0) {
      this.showSetupInstructions();
      return false;
    } else if (response === 1) {
      return await this.promptForCredentials();
    }

    return false;
  }

  // Show setup instructions
  showSetupInstructions() {
    const instructions = `Gmail API Setup Instructions:

1. Go to Google Cloud Console (https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth2 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Desktop application"
   - Download the credentials JSON file
5. Copy the client_id and client_secret from the JSON file
6. Add them to the app when prompted

Note: This is a one-time setup process.`;

    dialog.showMessageBox({
      type: 'info',
      title: 'Gmail API Setup Instructions',
      message: instructions,
      buttons: ['Copy Instructions', 'OK'],
      defaultId: 1
    }).then(result => {
      if (result.response === 0) {
        require('electron').clipboard.writeText(instructions);
      }
    });
  }

  // Prompt for OAuth2 credentials
  async promptForCredentials() {
    // In a real implementation, you'd create a custom dialog
    // For now, we'll use basic prompts
    try {
      const clientId = await this.showInputDialog('Enter Gmail Client ID', 'Please enter your OAuth2 Client ID:');
      if (!clientId) return false;

      const clientSecret = await this.showInputDialog('Enter Gmail Client Secret', 'Please enter your OAuth2 Client Secret:');
      if (!clientSecret) return false;

      this.gmailScanner.saveCredentials({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
      });

      dialog.showMessageBox({
        type: 'info',
        title: 'Credentials Saved',
        message: 'Gmail credentials have been saved successfully!',
        detail: 'You can now proceed with email scanning.',
        buttons: ['OK']
      });

      return true;
    } catch (error) {
      console.error('❌ Credentials setup failed:', error);
      return false;
    }
  }

  // Simple input dialog (you might want to create a proper HTML dialog)
  async showInputDialog(title, message) {
    return new Promise((resolve) => {
      // This is a simplified approach - in production you'd use a proper dialog
      const { dialog } = require('electron');
      
      dialog.showMessageBox({
        type: 'question',
        title: title,
        message: message,
        detail: 'Note: In a production app, this would be a secure input field.',
        buttons: ['Cancel']
      }).then(() => {
        // For now, return null to indicate user needs to set up properly
        resolve(null);
      });
    });
  }

  // Prompt for authorization code
  async promptForAuthCode() {
    return new Promise((resolve) => {
      // This would be replaced with a proper input dialog
      const { dialog } = require('electron');
      
      dialog.showMessageBox({
        type: 'question',
        title: 'Authorization Code',
        message: 'Please enter the authorization code from Google:',
        detail: 'Copy the authorization code from the browser and paste it here.',
        buttons: ['Cancel']
      }).then(() => {
        // For now, return null - user needs to implement proper input
        resolve(null);
      });
    });
  }

  // Test Gmail connection
  async testConnection() {
    try {
      const result = await this.gmailScanner.testConnection();
      if (result) {
        dialog.showMessageBox({
          type: 'info',
          title: 'Connection Successful',
          message: 'Gmail connection test successful!',
          detail: 'You can now scan emails for internship applications.',
          buttons: ['OK']
        });
      }
      return result;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }

  // Scan emails for internships
  async scanEmails(options = {}) {
    if (this.isScanning) {
      console.log('⚠️ Email scan already in progress');
      return this.scanResults;
    }

    try {
      this.isScanning = true;
      console.log('🔍 Starting email scan for internships...');

      // Show progress notification
      this.showScanProgress('Starting email scan...');

      const defaultOptions = {
        maxResults: 100,
        daysBack: 90,
        includeRead: true,
        ...options
      };

      const emails = await this.gmailScanner.scanForInternships(defaultOptions);
      
      this.showScanProgress(`Found ${emails.length} internship emails. Processing...`);

      // Process and deduplicate emails
      const processedEmails = await this.processEmailResults(emails);
      
      // Store scan results
      this.scanResults = processedEmails;
      this.lastScanTime = new Date().toISOString();
      
      emailDataStore.set('scanResults', this.scanResults);
      emailDataStore.set('lastScanTime', this.lastScanTime);

      console.log(`✅ Email scan complete. Found ${processedEmails.length} unique applications`);
      
      this.showScanComplete(processedEmails.length);
      
      return processedEmails;

    } catch (error) {
      console.error('❌ Email scan failed:', error);
      dialog.showErrorBox('Scan Failed', `Email scan failed: ${error.message}`);
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  // Process email results and deduplicate
  async processEmailResults(emails) {
    const processed = [];
    const existing = this.internshipStore.get('internships') || [];
    
    for (const email of emails) {
      const extractedData = email.analysis.extractedData;
      
      // Check if this application already exists
      const duplicate = existing.find(internship => 
        internship.companyName?.toLowerCase() === extractedData.company?.toLowerCase() &&
        internship.jobTitle?.toLowerCase() === extractedData.position?.toLowerCase()
      );

      if (!duplicate) {
        // Create internship entry from email data
        const internshipEntry = {
          id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          companyName: extractedData.company,
          jobTitle: extractedData.position || 'Position',
          location: extractedData.location || 'Not specified',
          status: extractedData.status,
          addedAt: extractedData.applicationDate,
          source: 'email',
          emailId: email.id,
          emailSubject: email.subject,
          emailFrom: email.from,
          emailDate: email.date.toISOString(),
          notes: `From email: ${email.subject}\n${extractedData.notes}`,
          confidence: email.analysis.details.confidence,
          autoDetected: true
        };

        processed.push({
          email,
          internship: internshipEntry,
          isNew: true
        });
      } else {
        // Update existing entry with email information
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

  // Add found internships to tracker
  async addInternshipsToTracker(processedEmails, options = {}) {
    const { autoAdd = false, confirmEach = true } = options;
    const added = [];
    const skipped = [];

    for (const item of processedEmails) {
      if (!item.isNew) {
        skipped.push(item);
        continue;
      }

      try {
        let shouldAdd = autoAdd;

        if (!autoAdd && confirmEach) {
          shouldAdd = await this.confirmAddInternship(item);
        }

        if (shouldAdd) {
          // Add to internship store
          const internships = this.internshipStore.get('internships') || [];
          internships.unshift(item.internship);
          this.internshipStore.set('internships', internships);

          added.push(item);
          console.log(`✅ Added: ${item.internship.companyName} - ${item.internship.jobTitle}`);
        } else {
          skipped.push(item);
        }
      } catch (error) {
        console.error(`❌ Failed to add internship: ${item.internship.companyName}`, error);
        skipped.push(item);
      }
    }

    // Notify main windows of updates
    this.notifyInternshipUpdates();

    console.log(`📊 Email processing complete: ${added.length} added, ${skipped.length} skipped`);
    
    return {
      added: added.length,
      skipped: skipped.length,
      total: processedEmails.length,
      details: { added, skipped }
    };
  }

  // Confirm adding internship with user
  async confirmAddInternship(item) {
    const { internship, email } = item;
    
    const result = await dialog.showMessageBox({
      type: 'question',
      title: 'Add Internship Application?',
      message: `Found internship application for ${internship.companyName}`,
      detail: `Position: ${internship.jobTitle}\nLocation: ${internship.location}\nStatus: ${internship.status}\nEmail: ${email.subject}\nConfidence: ${internship.confidence}%\n\nAdd this to your tracker?`,
      buttons: ['Add', 'Skip', 'Add All Remaining', 'Stop'],
      defaultId: 0
    });

    switch (result.response) {
      case 0: return true;  // Add
      case 1: return false; // Skip
      case 2: return 'addAll'; // Add all remaining
      case 3: return 'stop'; // Stop processing
      default: return false;
    }
  }

  // Show scan progress
  showScanProgress(message) {
    // In a real app, you might show this in the toolbar or a progress window
    console.log(`📧 ${message}`);
  }

  // Show scan completion
  showScanComplete(count) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Email Scan Complete',
      message: `Email scan completed successfully!`,
      detail: `Found ${count} internship applications in your emails.\n\nReview the results to add them to your tracker.`,
      buttons: ['OK']
    });
  }

  // Setup automatic scanning
  setupAutoScan() {
    if (this.autoScanEnabled) {
      this.startAutoScan();
    }
  }

  // Start automatic scanning
  startAutoScan() {
    if (this.autoScanTimer) {
      clearInterval(this.autoScanTimer);
    }

    const intervalMs = this.scanInterval * 60 * 60 * 1000; // Convert hours to milliseconds
    
    this.autoScanTimer = setInterval(async () => {
      try {
        console.log('⏰ Running automatic email scan...');
        await this.scanEmails({ maxResults: 50, daysBack: 7 });
      } catch (error) {
        console.error('❌ Auto-scan failed:', error);
      }
    }, intervalMs);

    console.log(`✅ Auto-scan enabled: every ${this.scanInterval} hours`);
  }

  // Stop automatic scanning
  stopAutoScan() {
    if (this.autoScanTimer) {
      clearInterval(this.autoScanTimer);
      this.autoScanTimer = null;
    }
    console.log('⏹️ Auto-scan stopped');
  }

  // Configure auto-scan settings
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

  // Get scan statistics
  getScanStats() {
    const results = emailDataStore.get('scanResults', []);
    const totalEmails = results.length;
    const newApplications = results.filter(r => r.isNew).length;
    const companies = [...new Set(results.map(r => r.internship.companyName))];
    
    return {
      lastScanTime: this.lastScanTime,
      totalEmailsFound: totalEmails,
      newApplications,
      uniqueCompanies: companies.length,
      autoScanEnabled: this.autoScanEnabled,
      scanInterval: this.scanInterval,
      isAuthenticated: this.gmailScanner.isGmailAuthenticated()
    };
  }

  // Get recent scan results
  getRecentResults(limit = 20) {
    return this.scanResults.slice(0, limit);
  }

  // Clear scan results
  clearScanResults() {
    this.scanResults = [];
    emailDataStore.delete('scanResults');
    emailDataStore.delete('lastScanTime');
    console.log('🗑️ Scan results cleared');
  }

  // Notify windows of internship updates
  notifyInternshipUpdates() {
    // Send update notifications to all windows
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();
    
    windows.forEach(window => {
      if (window.webContents) {
        window.webContents.send('internships-updated');
      }
    });
  }

  // Revoke Gmail access
  async revokeGmailAccess() {
    try {
      await this.gmailScanner.revokeAuth();
      this.stopAutoScan();
      this.clearScanResults();
      
      dialog.showMessageBox({
        type: 'info',
        title: 'Access Revoked',
        message: 'Gmail access has been revoked successfully.',
        detail: 'All stored tokens and scan results have been cleared.',
        buttons: ['OK']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error revoking access:', error);
      return false;
    }
  }

  // Export scan results
  async exportScanResults(format = 'json') {
    try {
      const { dialog } = require('electron');
      const fs = require('fs');
      const path = require('path');

      const result = await dialog.showSaveDialog({
        title: 'Export Email Scan Results',
        defaultPath: `email_scan_results_${new Date().toISOString().split('T')[0]}.${format}`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) return false;

      const data = {
        exportDate: new Date().toISOString(),
        scanStats: this.getScanStats(),
        results: this.scanResults
      };

      let content;
      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        content = this.convertToCSV(data.results);
      }

      fs.writeFileSync(result.filePath, content);
      
      dialog.showMessageBox({
        type: 'info',
        title: 'Export Complete',
        message: 'Email scan results exported successfully!',
        detail: `Saved to: ${result.filePath}`,
        buttons: ['OK']
      });

      return true;
    } catch (error) {
      console.error('❌ Export failed:', error);
      dialog.showErrorBox('Export Failed', `Failed to export results: ${error.message}`);
      return false;
    }
  }

  // Convert results to CSV format
  convertToCSV(results) {
    const headers = [
      'Company',
      'Position',
      'Location', 
      'Status',
      'Application Date',
      'Email Subject',
      'Email From',
      'Confidence',
      'Source'
    ];

    const rows = results.map(item => [
      item.internship.companyName,
      item.internship.jobTitle,
      item.internship.location,
      item.internship.status,
      item.internship.addedAt,
      item.email.subject,
      item.email.from,
      item.internship.confidence,
      item.internship.source
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell || ''}"`).join(','))
      .join('\n');
  }

  // Get authentication status
  getAuthStatus() {
    return {
      isAuthenticated: this.gmailScanner.isGmailAuthenticated(),
      hasCredentials: !!this.gmailScanner.getStoredCredentials(),
      lastScanTime: this.lastScanTime,
      autoScanEnabled: this.autoScanEnabled
    };
  }
}

module.exports = { EmailIntegration };