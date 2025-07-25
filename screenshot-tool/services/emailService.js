// screenshot-tool/services/emailService.js
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const Store = require('electron-store');

// Initialize email store
const emailStore = new Store({ name: 'email-settings' });

class GmailScanner {
  constructor() {
    this.gmail = null;
    this.oauth2Client = null;
    this.isAuthenticated = false;
    
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
        /entry.*level.*position/i
      ],
      
      senders: [
        /@.*\.com$/,
        /noreply/i,
        /careers/i,
        /recruiting/i,
        /talent/i,
        /hr/i,
        /jobs/i,
        /workday/i,
        /greenhouse/i,
        /lever/i,
        /bamboohr/i,
        /jobvite/i,
        /smartrecruiters/i,
        /successfactors/i
      ],
      
      companies: [
        'google', 'microsoft', 'amazon', 'apple', 'facebook', 'meta',
        'netflix', 'uber', 'airbnb', 'spotify', 'tesla', 'twitter',
        'linkedin', 'salesforce', 'adobe', 'nvidia', 'intel', 'ibm',
        'oracle', 'vmware', 'palantir', 'stripe', 'square', 'dropbox',
        'slack', 'zoom', 'docusign', 'snowflake', 'databricks',
        'coinbase', 'robinhood', 'pinterest', 'snap', 'tiktok',
        'goldman sachs', 'morgan stanley', 'jp morgan', 'blackrock',
        'two sigma', 'citadel', 'jane street', 'hudson river trading'
      ],
      
      keywords: [
        'application', 'internship', 'position', 'role', 'opportunity',
        'interview', 'assessment', 'coding challenge', 'technical screen',
        'onsite', 'virtual interview', 'phone screen', 'recruiter',
        'hiring manager', 'next steps', 'offer', 'compensation',
        'start date', 'background check', 'references'
      ]
    };
  }

  // Setup OAuth2 authentication
  async setupAuth() {
    try {
      // OAuth2 credentials (user will need to set these up)
      const credentials = emailStore.get('gmail_credentials');
      
      if (!credentials) {
        throw new Error('Gmail credentials not configured. Please run setup first.');
      }

      this.oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri
      );

      // Check if we have a stored token
      const token = emailStore.get('gmail_token');
      if (token) {
        this.oauth2Client.setCredentials(token);
        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        this.isAuthenticated = true;
        console.log('✅ Gmail authentication successful');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Gmail auth setup failed:', error);
      return false;
    }
  }

  // Get OAuth2 authorization URL
  getAuthUrl() {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Complete OAuth2 flow with authorization code
  async completeAuth(authCode) {
    try {
      const { tokens } = await this.oauth2Client.getToken(authCode);
      this.oauth2Client.setCredentials(tokens);
      
      // Store tokens securely
      emailStore.set('gmail_token', tokens);
      
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.isAuthenticated = true;
      
      console.log('✅ Gmail authentication completed');
      return true;
    } catch (error) {
      console.error('❌ Gmail auth completion failed:', error);
      return false;
    }
  }

  // Scan emails for internship applications
  async scanForInternships(options = {}) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Gmail');
    }

    const {
      maxResults = 100,
      daysBack = 90,
      includeRead = true
    } = options;

    try {
      console.log('🔍 Scanning emails for internship applications...');
      
      // Calculate date range
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysBack);
      const dateQuery = Math.floor(dateFrom.getTime() / 1000);

      // Build Gmail search query
      const queries = [
        'internship',
        'application submitted',
        'thank you for applying',
        'application received',
        'interview invitation',
        'coding challenge',
        'assessment',
        'next steps',
        'application status',
        'position',
        'opportunity'
      ];

      const searchQuery = `(${queries.map(q => `"${q}"`).join(' OR ')}) after:${dateQuery}`;
      
      console.log('📧 Search query:', searchQuery);

      // Search for emails
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: maxResults
      });

      const messages = response.data.messages || [];
      console.log(`📨 Found ${messages.length} potential emails`);

      if (messages.length === 0) {
        return [];
      }

      // Analyze each message
      const internshipEmails = [];
      const batchSize = 10;
      
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(message => this.analyzeMessage(message.id))
        );
        
        internshipEmails.push(...batchResults.filter(Boolean));
        
        // Progress logging
        console.log(`📊 Processed ${Math.min(i + batchSize, messages.length)}/${messages.length} emails`);
        
        // Rate limiting
        if (i + batchSize < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Found ${internshipEmails.length} internship-related emails`);
      return internshipEmails;

    } catch (error) {
      console.error('❌ Email scanning failed:', error);
      throw error;
    }
  }

  // Analyze individual message for internship content
  async analyzeMessage(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;
      
      // Extract email metadata
      const subject = this.getHeader(headers, 'Subject') || '';
      const from = this.getHeader(headers, 'From') || '';
      const to = this.getHeader(headers, 'To') || '';
      const date = this.getHeader(headers, 'Date') || '';
      const messageId = this.getHeader(headers, 'Message-ID') || '';

      // Get email body
      const body = this.extractEmailBody(message.payload);
      
      // Analyze if this is an internship-related email
      const analysis = this.analyzeEmailContent(subject, from, body);
      
      if (!analysis.isInternshipRelated) {
        return null;
      }

      console.log(`📧 Found internship email: ${subject.substring(0, 50)}...`);

      return {
        id: message.id,
        threadId: message.threadId,
        subject,
        from,
        to,
        date: new Date(date),
        body,
        analysis,
        rawMessage: message,
        processed: false
      };

    } catch (error) {
      console.error(`❌ Error analyzing message ${messageId}:`, error);
      return null;
    }
  }

  // Extract specific header value
  getHeader(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  }

  // Extract email body from message payload
  extractEmailBody(payload) {
    let body = '';

    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString();
        } else if (part.mimeType === 'text/html' && part.body.data && !body) {
          // Fallback to HTML if no plain text
          const htmlBody = Buffer.from(part.body.data, 'base64').toString();
          body = this.stripHtml(htmlBody);
        }
      }
    }

    return body;
  }

  // Strip HTML tags from email body
  stripHtml(html) {
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Analyze email content for internship relevance
  analyzeEmailContent(subject, from, body) {
    const content = `${subject} ${from} ${body}`.toLowerCase();
    
    let score = 0;
    const details = {
      subjectMatch: false,
      senderMatch: false,
      companyMatch: '',
      keywordMatches: [],
      confidence: 0
    };

    // Check subject patterns
    for (const pattern of this.internshipPatterns.subjects) {
      if (pattern.test(subject)) {
        score += 30;
        details.subjectMatch = true;
        break;
      }
    }

    // Check sender patterns
    for (const pattern of this.internshipPatterns.senders) {
      if (pattern.test(from)) {
        score += 20;
        details.senderMatch = true;
        break;
      }
    }

    // Check for company mentions
    for (const company of this.internshipPatterns.companies) {
      if (content.includes(company.toLowerCase())) {
        score += 25;
        details.companyMatch = company;
        break;
      }
    }

    // Check for keywords
    for (const keyword of this.internshipPatterns.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score += 5;
        details.keywordMatches.push(keyword);
      }
    }

    // Additional scoring for specific phrases
    const strongIndicators = [
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
      'summer internship',
      'co-op position'
    ];

    for (const indicator of strongIndicators) {
      if (content.includes(indicator)) {
        score += 15;
      }
    }

    details.confidence = Math.min(score, 100);
    
    // Extract potential company name from sender
    if (!details.companyMatch) {
      const companyMatch = from.match(/@([a-zA-Z0-9.-]+)\./);
      if (companyMatch) {
        const domain = companyMatch[1].toLowerCase();
        if (!domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('outlook')) {
          details.companyMatch = this.formatCompanyName(domain);
        }
      }
    }

    return {
      isInternshipRelated: score >= 30,
      score,
      details,
      extractedData: this.extractJobDetails(subject, body, details.companyMatch)
    };
  }

  // Extract job details from email content
  extractJobDetails(subject, body, companyHint) {
    const content = `${subject} ${body}`;
    
    const details = {
      company: companyHint || 'Unknown Company',
      position: '',
      location: '',
      status: 'applied',
      applicationDate: new Date().toISOString(),
      source: 'email',
      notes: ''
    };

    // Extract position from subject or body
    const positionPatterns = [
      /(?:for|position|role)\s+(.+?)(?:\s+at|\s+internship|$)/i,
      /(.+?)\s+internship/i,
      /internship\s+[-–]\s+(.+)/i,
      /(.+?)\s+position/i,
      /software\s+(engineer|developer|intern)/i,
      /(frontend|backend|full.?stack|data|product|ux|ui)\s+(engineer|developer|designer|analyst|intern)/i
    ];

    for (const pattern of positionPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        details.position = match[1].trim();
        break;
      }
    }

    // Extract location
    const locationPatterns = [
      /(?:location|based|office):\s*([^,\n]+)/i,
      /([A-Z][a-z]+,\s*[A-Z]{2})\b/g, // City, State
      /\b(Remote|Hybrid|On-site)\b/i,
      /\b(San Francisco|New York|Seattle|Austin|Boston|Chicago|Los Angeles|Denver|Portland|Miami)\b/i
    ];

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        details.location = match[1].trim();
        break;
      }
    }

    // Determine status from email content
    if (/interview|next\s+steps|assessment|coding\s+challenge/i.test(content)) {
      details.status = 'interview';
    } else if (/offer|congratulations|pleased\s+to\s+offer/i.test(content)) {
      details.status = 'offer';
    } else if (/unfortunately|regret|not\s+selected|rejected/i.test(content)) {
      details.status = 'rejected';
    }

    // Extract application date if mentioned
    const datePatterns = [
      /applied\s+on\s+([^,\n]+)/i,
      /submitted\s+on\s+([^,\n]+)/i,
      /application\s+date:\s*([^,\n]+)/i
    ];

    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        try {
          const parsedDate = new Date(match[1].trim());
          if (!isNaN(parsedDate.getTime())) {
            details.applicationDate = parsedDate.toISOString();
          }
        } catch (e) {
          // Invalid date, keep default
        }
        break;
      }
    }

    // Add relevant notes
    const notes = [];
    if (/coding\s+challenge/i.test(content)) notes.push('Coding challenge mentioned');
    if (/interview/i.test(content)) notes.push('Interview scheduled');
    if (/references/i.test(content)) notes.push('References requested');
    if (/background\s+check/i.test(content)) notes.push('Background check required');
    
    details.notes = notes.join('; ');

    return details;
  }

  // Format company name from domain
  formatCompanyName(domain) {
    // Remove common subdomains
    domain = domain.replace(/^(www|mail|email|careers|jobs|talent)\./, '');
    
    // Split by dots and take the main part
    const parts = domain.split('.');
    const mainPart = parts[0];
    
    // Capitalize first letter
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  }

  // Get authentication status
  isGmailAuthenticated() {
    return this.isAuthenticated;
  }

  // Revoke authentication
  async revokeAuth() {
    try {
      if (this.oauth2Client) {
        await this.oauth2Client.revokeCredentials();
      }
      
      // Clear stored tokens
      emailStore.delete('gmail_token');
      
      this.gmail = null;
      this.oauth2Client = null;
      this.isAuthenticated = false;
      
      console.log('✅ Gmail authentication revoked');
      return true;
    } catch (error) {
      console.error('❌ Error revoking auth:', error);
      return false;
    }
  }

  // Test connection
  async testConnection() {
    if (!this.isAuthenticated) {
      return false;
    }

    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });
      
      console.log('✅ Gmail connection test successful');
      console.log(`📧 Email: ${response.data.emailAddress}`);
      console.log(`📊 Total messages: ${response.data.messagesTotal}`);
      
      return true;
    } catch (error) {
      console.error('❌ Gmail connection test failed:', error);
      return false;
    }
  }

  // Save Gmail credentials
  saveCredentials(credentials) {
    emailStore.set('gmail_credentials', {
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      redirect_uri: credentials.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob'
    });
    
    console.log('✅ Gmail credentials saved');
  }

  // Get stored credentials
  getStoredCredentials() {
    return emailStore.get('gmail_credentials');
  }
}

module.exports = { GmailScanner };