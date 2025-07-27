// screenshot-tool/services/emailService.js
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const Store = require('electron-store');
const { shell } = require('electron');

// Initialize email store
const emailStore = new Store({ name: 'email-settings' });

class GmailScanner {
  constructor() {
    this.gmail = null;
    this.oauth2Client = null;
    this.isAuthenticated = false;
    this.authInProgress = false;
    
    // Simplified OAuth redirect URI for desktop apps
    this.REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
    
    // Email patterns for detecting internship applications
    this.internshipPatterns = {
      subjects: [
        /internship.*application/i,
        /application.*internship/i,
        /thank.*you.*applying/i,
        /application.*received/i,
        /application.*submitted/i,
        /confirmation.*application/i,
        /your.*application.*for/i,
        /application.*status/i,
        /interview.*invitation/i,
        /next.*steps.*application/i,
        /application.*review/i,
        /position.*application/i,
        /job.*application/i,
        /summer.*internship/i,
        /co-?op.*application/i,
        /graduate.*program/i,
        /entry.*level.*position/i,
        /coding.*challenge/i,
        /technical.*assessment/i,
        /offer.*letter/i,
        /congratulations.*position/i,
        /unfortunately.*application/i
      ],
      
      senders: [
        /noreply/i,
        /no-reply/i,
        /careers/i,
        /recruiting/i,
        /talent/i,
        /hr@/i,
        /jobs@/i,
        /workday/i,
        /greenhouse/i,
        /lever/i,
        /bamboohr/i,
        /jobvite/i,
        /smartrecruiters/i,
        /successfactors/i,
        /taleo/i,
        /icims/i,
        /myworkdaysite/i
      ],
      
      keywords: [
        'application', 'internship', 'position', 'role', 'opportunity',
        'interview', 'assessment', 'coding challenge', 'technical screen',
        'onsite', 'virtual interview', 'phone screen', 'recruiter',
        'hiring manager', 'next steps', 'offer', 'compensation',
        'start date', 'background check', 'references', 'congratulations',
        'unfortunately', 'regret to inform', 'not selected'
      ]
    };
  }

  // Initialize Gmail authentication - matches EmailIntegration expectations
  async initialize() {
    try {
      console.log('🚀 Initializing Gmail scanner...');
      
      const credentials = this.getStoredCredentials();
      if (!credentials) {
        console.log('⚠️ No Gmail credentials found');
        return { success: false, needsSetup: true };
      }

      this.oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        this.REDIRECT_URI
      );

      // Check if we have valid tokens
      const token = emailStore.get('gmail_token');
      if (token) {
        this.oauth2Client.setCredentials(token);
        
        // Test if token is still valid
        try {
          this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
          await this.gmail.users.getProfile({ userId: 'me' });
          
          this.isAuthenticated = true;
          console.log('✅ Gmail authentication successful');
          return { success: true, needsSetup: false };
        } catch (error) {
          console.log('⚠️ Stored token invalid, re-authentication needed');
          emailStore.delete('gmail_token');
        }
      }

      return { success: false, needsSetup: false, needsAuth: true };
    } catch (error) {
      console.error('❌ Gmail initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Setup Gmail credentials - matches EmailIntegration expectations
  setupCredentials(clientId, clientSecret) {
    try {
      if (!clientId || !clientSecret) {
        throw new Error('Client ID and Client Secret are required');
      }

      // Validate credentials format
      if (!clientId.includes('.googleusercontent.com')) {
        throw new Error('Invalid Client ID format');
      }

      const credentials = {
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: this.REDIRECT_URI
      };

      emailStore.set('gmail_credentials', credentials);
      console.log('✅ Gmail credentials saved');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Credential setup failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Start authentication flow
  async startAuthFlow() {
    try {
      if (this.authInProgress) {
        throw new Error('Authentication already in progress');
      }

      const credentials = this.getStoredCredentials();
      if (!credentials) {
        throw new Error('No credentials configured. Please setup credentials first.');
      }

      this.authInProgress = true;

      this.oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        this.REDIRECT_URI
      );

      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly'
      ];

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      console.log('🔗 Opening authorization URL...');
      
      // Open browser with auth URL
      await shell.openExternal(authUrl);
      
      return { 
        success: true, 
        authUrl,
        message: 'Browser opened for authorization. Copy the authorization code when prompted.'
      };
    } catch (error) {
      this.authInProgress = false;
      console.error('❌ Auth flow start failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Complete authentication with authorization code
  async completeAuth(authCode) {
    try {
      if (!this.authInProgress) {
        throw new Error('No authentication flow in progress');
      }

      if (!authCode || authCode.trim().length === 0) {
        throw new Error('Authorization code is required');
      }

      console.log('🔑 Exchanging authorization code for tokens...');

      const { tokens } = await this.oauth2Client.getToken(authCode.trim());
      this.oauth2Client.setCredentials(tokens);
      
      // Store tokens securely
      emailStore.set('gmail_token', tokens);
      
      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.isAuthenticated = true;
      this.authInProgress = false;
      
      // Test the connection
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      
      console.log('✅ Gmail authentication completed successfully');
      console.log(`📧 Connected to: ${profile.data.emailAddress}`);
      
      return { 
        success: true, 
        email: profile.data.emailAddress,
        totalMessages: profile.data.messagesTotal
      };
    } catch (error) {
      this.authInProgress = false;
      console.error('❌ Auth completion failed:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('invalid_grant')) {
        errorMessage = 'Invalid or expired authorization code. Please try again.';
      } else if (error.message.includes('invalid_client')) {
        errorMessage = 'Invalid client credentials. Please check your setup.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Scan emails with improved error handling and progress reporting
  async scanForInternships(options = {}, progressCallback = null) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Gmail. Please authenticate first.');
    }

    const {
      maxResults = 50,
      daysBack = 30,
      includeRead = true
    } = options;

    try {
      console.log('🔍 Starting email scan for internships...');
      
      if (progressCallback) {
        progressCallback('Initializing email scan...', 0);
      }

      // Calculate date range
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysBack);
      const dateQuery = Math.floor(dateFrom.getTime() / 1000);

      // Build comprehensive search query
      const searchTerms = [
        'internship',
        'application',
        '"thank you for applying"',
        '"application received"',
        '"interview invitation"',
        '"coding challenge"',
        '"next steps"',
        '"position"',
        '"opportunity"',
        '"congratulations"',
        '"unfortunately"'
      ];

      const searchQuery = `(${searchTerms.join(' OR ')}) after:${dateQuery}`;
      
      console.log(`📧 Search query: ${searchQuery}`);
      console.log(`📅 Date range: Last ${daysBack} days`);

      if (progressCallback) {
        progressCallback('Searching Gmail...', 10);
      }

      // Search for emails
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: Math.min(maxResults, 500) // API limit
      });

      const messages = response.data.messages || [];
      console.log(`📨 Found ${messages.length} potential emails`);

      if (messages.length === 0) {
        if (progressCallback) {
          progressCallback('No emails found', 100);
        }
        return [];
      }

      if (progressCallback) {
        progressCallback(`Analyzing ${messages.length} emails...`, 20);
      }

      // Analyze messages in batches with progress reporting
      const internshipEmails = [];
      const batchSize = 5; // Smaller batches for better UX
      
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        // Process batch
        const batchResults = await Promise.allSettled(
          batch.map(message => this.analyzeMessage(message.id))
        );
        
        // Extract successful results
        const validResults = batchResults
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => result.value);
        
        internshipEmails.push(...validResults);
        
        // Update progress
        const progress = 20 + Math.floor((i + batchSize) / messages.length * 70);
        const processed = Math.min(i + batchSize, messages.length);
        
        if (progressCallback) {
          progressCallback(`Processed ${processed}/${messages.length} emails`, progress);
        }
        
        console.log(`📊 Batch ${Math.floor(i/batchSize) + 1}: ${validResults.length} internship emails found`);
        
        // Rate limiting to avoid API quotas
        if (i + batchSize < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Sort by relevance (confidence score)
      internshipEmails.sort((a, b) => b.analysis.score - a.analysis.score);

      if (progressCallback) {
        progressCallback(`Scan complete! Found ${internshipEmails.length} internship emails`, 100);
      }

      console.log(`✅ Scan complete: ${internshipEmails.length} internship-related emails found`);
      
      return internshipEmails;

    } catch (error) {
      console.error('❌ Email scanning failed:', error);
      
      // Handle specific API errors
      if (error.code === 429) {
        throw new Error('Gmail API rate limit exceeded. Please try again later.');
      } else if (error.code === 403) {
        throw new Error('Gmail API access denied. Please check your permissions.');
      } else if (error.code === 401) {
        // Token expired, clear it
        emailStore.delete('gmail_token');
        this.isAuthenticated = false;
        throw new Error('Authentication expired. Please re-authenticate.');
      }
      
      throw error;
    }
  }

  // Improved message analysis with better error handling
  async analyzeMessage(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      if (!message.payload || !message.payload.headers) {
        return null;
      }

      const headers = message.payload.headers;
      
      // Extract email metadata
      const subject = this.getHeader(headers, 'Subject') || '';
      const from = this.getHeader(headers, 'From') || '';
      const to = this.getHeader(headers, 'To') || '';
      const date = this.getHeader(headers, 'Date') || '';

      // Skip if missing essential data
      if (!subject && !from) {
        return null;
      }

      // Get email body
      const body = this.extractEmailBody(message.payload);
      
      // Analyze content
      const analysis = this.analyzeEmailContent(subject, from, body);
      
      // Only return if it's internship-related with decent confidence
      if (!analysis.isInternshipRelated || analysis.score < 25) {
        return null;
      }

      return {
        id: message.id,
        threadId: message.threadId,
        subject,
        from,
        to,
        date: new Date(date),
        body: body.substring(0, 1000), // Limit body size
        analysis,
        processed: false,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`❌ Error analyzing message ${messageId}:`, error.message);
      return null;
    }
  }

  // Enhanced content analysis with better scoring
  analyzeEmailContent(subject, from, body) {
    const content = `${subject} ${from} ${body}`.toLowerCase();
    
    let score = 0;
    const details = {
      subjectMatch: false,
      senderMatch: false,
      companyMatch: '',
      keywordMatches: [],
      confidence: 0,
      indicators: []
    };

    // Subject analysis (high weight)
    for (const pattern of this.internshipPatterns.subjects) {
      if (pattern.test(subject)) {
        score += 35;
        details.subjectMatch = true;
        details.indicators.push('Subject match');
        break;
      }
    }

    // Sender analysis
    for (const pattern of this.internshipPatterns.senders) {
      if (pattern.test(from)) {
        score += 25;
        details.senderMatch = true;
        details.indicators.push('Sender match');
        break;
      }
    }

    // Company extraction from sender
    const companyMatch = this.extractCompanyFromSender(from);
    if (companyMatch) {
      score += 15;
      details.companyMatch = companyMatch;
      details.indicators.push(`Company: ${companyMatch}`);
    }

    // Keyword analysis
    const keywordScore = this.scoreKeywords(content);
    score += keywordScore.score;
    details.keywordMatches = keywordScore.matches;
    
    if (keywordScore.matches.length > 0) {
      details.indicators.push(`${keywordScore.matches.length} keywords`);
    }

    // Strong phrase indicators
    const strongPhrases = [
      'application submitted',
      'thank you for applying',
      'application received',
      'next steps',
      'interview invitation',
      'coding challenge',
      'technical assessment',
      'background check',
      'offer letter',
      'internship position',
      'congratulations',
      'unfortunately',
      'regret to inform',
      'not selected'
    ];

    for (const phrase of strongPhrases) {
      if (content.includes(phrase)) {
        score += 20;
        details.indicators.push(`Strong phrase: ${phrase}`);
      }
    }

    // Email format indicators
    if (from.includes('noreply') || from.includes('no-reply')) {
      score += 10;
      details.indicators.push('Automated sender');
    }

    details.confidence = Math.min(score, 100);
    
    return {
      isInternshipRelated: score >= 30,
      score,
      details,
      extractedData: this.extractJobDetails(subject, body, details.companyMatch)
    };
  }

  // Improved keyword scoring
  scoreKeywords(content) {
    let score = 0;
    const matches = [];

    for (const keyword of this.internshipPatterns.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score += 3;
        matches.push(keyword);
      }
    }

    return { score: Math.min(score, 30), matches };
  }

  // Better company extraction
  extractCompanyFromSender(fromField) {
    try {
      // Extract email address
      const emailMatch = fromField.match(/<([^>]+)>/);
      const email = emailMatch ? emailMatch[1] : fromField;
      
      // Extract domain
      const domainMatch = email.match(/@([^.]+)\./);
      if (!domainMatch) return '';
      
      const domain = domainMatch[1].toLowerCase();
      
      // Skip common email providers
      const providers = ['gmail', 'yahoo', 'outlook', 'hotmail', 'aol', 'icloud'];
      if (providers.includes(domain)) return '';
      
      // Format company name
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch (error) {
      return '';
    }
  }

  // Enhanced job details extraction
  extractJobDetails(subject, body, companyHint) {
    const content = `${subject} ${body}`;
    
    const details = {
      company: companyHint || 'Unknown Company',
      position: this.extractPosition(content),
      location: this.extractLocation(content),
      status: this.determineStatus(content),
      applicationDate: new Date().toISOString(),
      source: 'email',
      notes: this.generateNotes(content)
    };

    return details;
  }

  // Extract position with better patterns
  extractPosition(content) {
    const patterns = [
      /(?:for|position|role)\s+(.+?)(?:\s+at|\s+internship|$)/i,
      /(.+?)\s+internship/i,
      /internship\s+[-–]\s+(.+)/i,
      /(.+?)\s+position/i,
      /(software|frontend|backend|full.?stack|data|product|ux|ui)\s+(engineer|developer|designer|analyst|intern)/i,
      /summer\s+(.+?)\s+intern/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        return match[1].trim();
      }
    }

    return 'Position';
  }

  // Extract location with common patterns
  extractLocation(content) {
    const patterns = [
      /(?:location|based|office):\s*([^,\n]+)/i,
      /([A-Z][a-z]+,\s*[A-Z]{2})\b/, // City, State
      /\b(Remote|Hybrid|On-site)\b/i,
      /\b(San Francisco|New York|Seattle|Austin|Boston|Chicago|Los Angeles|Denver|Portland|Miami|Atlanta|Dallas|Philadelphia|Phoenix|San Diego)\b/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'Not specified';
  }

  // Determine application status from content
  determineStatus(content) {
    const lowerContent = content.toLowerCase();
    
    if (/offer|congratulations|pleased\s+to\s+offer|welcome\s+to\s+the\s+team/i.test(lowerContent)) {
      return 'offer';
    } else if (/unfortunately|regret|not\s+selected|rejected|will\s+not\s+be\s+moving\s+forward/i.test(lowerContent)) {
      return 'rejected';
    } else if (/interview|next\s+steps|assessment|coding\s+challenge|technical\s+screen|phone\s+screen/i.test(lowerContent)) {
      return 'interview';
    } else if (/application.*received|thank.*you.*applying|submitted.*successfully/i.test(lowerContent)) {
      return 'applied';
    }
    
    return 'applied';
  }

  // Generate helpful notes
  generateNotes(content) {
    const notes = [];
    const lowerContent = content.toLowerCase();
    
    if (/coding\s+challenge/i.test(lowerContent)) notes.push('Coding challenge');
    if (/technical\s+assessment/i.test(lowerContent)) notes.push('Technical assessment');
    if (/interview/i.test(lowerContent)) notes.push('Interview mentioned');
    if (/references/i.test(lowerContent)) notes.push('References requested');
    if (/background\s+check/i.test(lowerContent)) notes.push('Background check');
    if (/deadline/i.test(lowerContent)) notes.push('Has deadline');
    
    return notes.join('; ');
  }

  // Helper methods
  getHeader(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  }

  extractEmailBody(payload) {
    let body = '';

    try {
      if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf8');
      } else if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body && part.body.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf8');
          } else if (part.mimeType === 'text/html' && part.body && part.body.data && !body) {
            const htmlBody = Buffer.from(part.body.data, 'base64').toString('utf8');
            body = this.stripHtml(htmlBody);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting email body:', error);
      body = '[Body extraction failed]';
    }

    return body.substring(0, 5000); // Limit body size
  }

  stripHtml(html) {
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Authentication and connection methods
  async testConnection() {
    if (!this.isAuthenticated || !this.gmail) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });
      
      return {
        success: true,
        email: response.data.emailAddress,
        totalMessages: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal
      };
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      
      // Handle token expiration
      if (error.code === 401) {
        emailStore.delete('gmail_token');
        this.isAuthenticated = false;
        return { success: false, error: 'Authentication expired', needsReauth: true };
      }
      
      return { success: false, error: error.message };
    }
  }

  async revokeAuth() {
    try {
      if (this.oauth2Client) {
        await this.oauth2Client.revokeCredentials();
      }
    } catch (error) {
      console.warn('Error revoking OAuth credentials:', error);
    }
    
    // Clear all stored data
    emailStore.delete('gmail_token');
    emailStore.delete('gmail_credentials');
    
    this.gmail = null;
    this.oauth2Client = null;
    this.isAuthenticated = false;
    this.authInProgress = false;
    
    console.log('✅ Gmail authentication revoked and data cleared');
    return { success: true };
  }

  // Status and credential methods
  isGmailAuthenticated() {
    return this.isAuthenticated;
  }

  getStoredCredentials() {
    return emailStore.get('gmail_credentials');
  }

  getConnectionStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      hasCredentials: !!this.getStoredCredentials(),
      authInProgress: this.authInProgress
    };
  }

  // Clear all data
  clearAllData() {
    emailStore.clear();
    this.gmail = null;
    this.oauth2Client = null;
    this.isAuthenticated = false;
    this.authInProgress = false;
    console.log('🗑️ All Gmail data cleared');
  }
}

module.exports = { GmailScanner };