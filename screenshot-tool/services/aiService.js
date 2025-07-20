const { OpenAI } = require('openai');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client with OpenRouter
// Use a working API key for OpenRouter
const apiKey = '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';
const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://openrouter.ai/api/v1'
});

/**
 * Extract text from an image using Tesseract OCR
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromImage(imagePath) {
  try {
    console.log(`Extracting text from image: ${imagePath}`);
    
    const result = await Tesseract.recognize(
      imagePath,
      'eng',
      { logger: m => console.log(m) }
    );
    
    console.log(`Text extraction complete. Found ${result.data.text.length} characters`);
    return result.data.text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw error;
  }
}

/**
 * Create a mock job information response when API is not available
 * @param {string} text - The extracted text to analyze
 * @returns {Object} - Mock job information
 */
function createMockJobInfo(text) {
  // Clean and normalize the text
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const cleanText = text.toLowerCase();
  
  // Enhanced keyword matching
  const jobTitleKeywords = [
    'software engineer', 'software developer', 'frontend developer', 'backend developer', 
    'full stack developer', 'data scientist', 'data analyst', 'product manager',
    'ux designer', 'ui designer', 'devops engineer', 'qa engineer', 'intern',
    'internship', 'junior developer', 'senior developer', 'lead developer',
    'machine learning engineer', 'ai engineer', 'research intern', 'swe intern'
  ];
  
  const locationKeywords = [
    'remote', 'hybrid', 'san francisco', 'new york', 'seattle', 'austin', 
    'boston', 'california', 'ca', 'ny', 'wa', 'tx', 'usa', 'united states',
    'london', 'toronto', 'vancouver', 'berlin', 'amsterdam', 'onsite', 'on-site'
  ];
  
  const companyIndicators = [
    'company', 'corp', 'corporation', 'inc', 'llc', 'ltd', 'technologies',
    'tech', 'labs', 'systems', 'solutions', 'group', 'team', 'startup'
  ];
  
  const salaryKeywords = [
    '$', 'usd', 'salary', 'compensation', 'per hour', '/hour', 'hourly',
    'annually', 'per year', '/year', 'stipend', 'paid', 'unpaid'
  ];
  
  // Extract potential information
  let potentialCompany = extractCompanyName(lines, cleanText, companyIndicators, text);
  let potentialTitle = extractJobTitle(lines, cleanText, jobTitleKeywords);
  let potentialLocation = extractLocation(lines, cleanText, locationKeywords);
  let potentialSalary = extractSalary(lines, cleanText, salaryKeywords);
  let { requirements, skills } = extractRequirementsAndSkills(cleanText);
  let benefits = extractBenefits(cleanText);
  
  // Return comprehensive format matching AI extraction
  return {
    // Basic Information
    company: potentialCompany,
    jobTitle: potentialTitle,
    location: potentialLocation,
    workArrangement: extractWorkArrangement(cleanText),
    salary: potentialSalary,
    jobType: determineJobType(cleanText),
    duration: extractDuration(cleanText),
    department: extractDepartment(cleanText),
    seniority: extractSeniority(cleanText),
    
    // Detailed Requirements
    requirements: {
      education: extractEducationRequirements(cleanText),
      experience: extractExperienceRequirements(cleanText),
      technical: skills,
      soft: extractSoftSkills(cleanText)
    },
    
    // Job Details
    responsibilities: extractResponsibilities(cleanText),
    skills: skills,
    qualifications: requirements,
    description: generateJobDescription(potentialTitle, potentialCompany),
    
    // Application Information
    applicationInfo: {
      deadline: extractDeadline(cleanText),
      process: 'Not specified',
      contact: extractContactInfo(text),
      applyUrl: 'Not specified'
    },
    
    // Benefits and Company Info
    benefits: benefits,
    companyInfo: {
      industry: extractIndustry(cleanText),
      size: 'Not specified',
      description: 'Not specified'
    },
    
    // Additional Details
    additionalInfo: {
      startDate: extractStartDate(cleanText),
      timezone: 'Not specified',
      travelRequired: 'Not specified',
      securityClearance: 'Not specified'
    },
    
    // Metadata
    extractionMetadata: {
      sourceType: detectSourceType(text),
      textLength: text.length,
      extractionDate: new Date().toISOString(),
      confidence: 'Low (Mock Data)'
    }
  };
}

// Helper function to extract company name
function extractCompanyName(lines, cleanText, companyIndicators, originalText) {
  // Look for company name in first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    
    // Skip very short lines or lines that look like job titles
    if (line.length < 3 || line.length > 50) continue;
    
    const lowerLine = line.toLowerCase();
    
    // Check if line contains company indicators
    if (companyIndicators.some(indicator => lowerLine.includes(indicator))) {
      return line;
    }
    
    // Check for well-known company patterns
    if (isLikelyCompanyName(line)) {
      return line;
    }
  }
  
  // Look for "at Company" or "Company is" patterns
  const atPattern = /\bat\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.|!)/g;
  const atMatch = atPattern.exec(originalText);
  if (atMatch && atMatch[1].length < 30) {
    return atMatch[1].trim();
  }
  
  // Fallback to first meaningful line
  for (const line of lines.slice(0, 3)) {
    if (line.length > 2 && line.length < 40 && !line.toLowerCase().includes('job') && !line.toLowerCase().includes('position')) {
      return line;
    }
  }
  
  return 'Company not specified';
}

// Helper to check if a line looks like a company name
function isLikelyCompanyName(line) {
  // Check for patterns like "Microsoft", "Google Inc.", "Meta Platforms"
  const companyPatterns = [
    /^[A-Z][a-zA-Z\s&.,-]+(?:Inc|Corp|LLC|Ltd|Technologies|Tech|Labs|Systems|Solutions|Group)?\.?$/,
    /^[A-Z]{2,}$/,  // All caps like "IBM", "NASA"
    /^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/  // CamelCase like "Facebook", "LinkedIn"
  ];
  
  return companyPatterns.some(pattern => pattern.test(line)) && 
         line.length >= 2 && line.length <= 30;
}

// Helper function to extract job title
function extractJobTitle(lines, cleanText, jobTitleKeywords) {
  // Look for exact keyword matches first
  for (const keyword of jobTitleKeywords) {
    if (cleanText.includes(keyword)) {
      // Find the line containing this keyword
      for (const line of lines) {
        if (line.toLowerCase().includes(keyword)) {
          return cleanJobTitle(line);
        }
      }
    }
  }
  
  // Look for patterns like "Position:", "Role:", "Title:"
  const titlePatterns = [
    /(?:position|role|title|job)\s*:?\s*(.+)/i,
    /^(.+?)\s*-\s*(?:intern|internship|position|role)/i,
    /(?:seeking|hiring|looking for)\s+(?:a\s+)?(.+?)(?:\s|$|,|\.|!)/i
  ];
  
  for (const pattern of titlePatterns) {
    for (const line of lines) {
      const match = pattern.exec(line);
      if (match && match[1]) {
        return cleanJobTitle(match[1]);
      }
    }
  }
  
  // Fallback: look for lines that might be job titles
  for (const line of lines.slice(0, 8)) {
    if (looksLikeJobTitle(line)) {
      return cleanJobTitle(line);
    }
  }
  
  return 'Software Development Internship';
}

// Helper to clean job title
function cleanJobTitle(title) {
  return title.trim()
    .replace(/^[-•\s]+|[-•\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .substring(0, 100);
}

// Helper to check if line looks like job title
function looksLikeJobTitle(line) {
  const titleIndicators = ['engineer', 'developer', 'intern', 'analyst', 'manager', 'designer', 'specialist', 'coordinator', 'associate'];
  const lowerLine = line.toLowerCase();
  
  return titleIndicators.some(indicator => lowerLine.includes(indicator)) &&
         line.length > 5 && line.length < 80 &&
         !lowerLine.includes('company') && !lowerLine.includes('about');
}

// Helper function to extract location
function extractLocation(lines, cleanText, locationKeywords) {
  // Look for location patterns
  const locationPatterns = [
    /(?:location|based|office)\s*:?\s*(.+)/i,
    /(?:in|at)\s+([A-Z][a-zA-Z\s,]+?)(?:\s|$|,|\.|!)/g,
    /(remote|hybrid|on-?site)/i,
    /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)/g  // City, State format
  ];
  
  for (const pattern of locationPatterns) {
    const match = pattern.exec(cleanText);
    if (match && match[1]) {
      const location = match[1].trim();
      if (location.length > 2 && location.length < 50) {
        return location;
      }
    }
  }
  
  // Look for keyword matches in lines
  for (const keyword of locationKeywords) {
    for (const line of lines) {
      if (line.toLowerCase().includes(keyword)) {
        return line.trim().substring(0, 50);
      }
    }
  }
  
  return 'Location not specified';
}

// Helper function to extract salary
function extractSalary(lines, cleanText, salaryKeywords) {
  const salaryPatterns = [
    /\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?)?(?:\s*(?:per\s+)?(?:hour|hr|year|annually|month))?/gi,
    /(?:salary|compensation|pay|wage)\s*:?\s*\$?[\d,]+/gi,
    /[\d,]+\s*(?:per\s+)?(?:hour|hr)(?:\s*-\s*[\d,]+\s*(?:per\s+)?(?:hour|hr))?/gi,
    /(unpaid|voluntary|no\s+compensation)/gi
  ];
  
  for (const pattern of salaryPatterns) {
    const match = pattern.exec(cleanText);
    if (match) {
      return match[0].trim();
    }
  }
  
  return 'Not specified';
}

// Helper function to determine job type
function determineJobType(cleanText) {
  if (cleanText.includes('intern') || cleanText.includes('internship')) return 'internship';
  if (cleanText.includes('full-time') || cleanText.includes('full time')) return 'full-time';
  if (cleanText.includes('part-time') || cleanText.includes('part time')) return 'part-time';
  if (cleanText.includes('contract') || cleanText.includes('contractor')) return 'contract';
  if (cleanText.includes('freelance')) return 'freelance';
  return 'internship';
}

// Helper function to extract requirements and skills
function extractRequirementsAndSkills(cleanText) {
  const skillKeywords = [
    'javascript', 'python', 'java', 'react', 'node.js', 'typescript', 'html', 'css',
    'sql', 'git', 'aws', 'docker', 'kubernetes', 'mongodb', 'postgresql', 'express',
    'angular', 'vue', 'swift', 'kotlin', 'c++', 'c#', 'ruby', 'go', 'rust',
    'machine learning', 'ai', 'data science', 'analytics', 'figma', 'sketch'
  ];
  
  const requirementKeywords = [
    'bachelor', 'degree', 'experience', 'years', 'gpa', 'portfolio', 'github',
    'communication', 'teamwork', 'problem solving', 'analytical', 'creative'
  ];
  
  const foundSkills = [];
  const foundRequirements = [];
  
  for (const skill of skillKeywords) {
    if (cleanText.includes(skill.toLowerCase())) {
      foundSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  }
  
  for (const req of requirementKeywords) {
    if (cleanText.includes(req)) {
      foundRequirements.push(req.charAt(0).toUpperCase() + req.slice(1));
    }
  }
  
  // Add default skills and requirements if none found
  if (foundSkills.length === 0) {
    foundSkills.push('JavaScript', 'React', 'Node.js', 'Git');
  }
  
  if (foundRequirements.length === 0) {
    foundRequirements.push('Strong programming skills', 'Problem-solving abilities', 'Team collaboration');
  }
  
  return { requirements: foundRequirements, skills: foundSkills };
}

// Helper function to extract benefits
function extractBenefits(cleanText) {
  const benefitKeywords = [
    'health insurance', 'dental', 'vision', '401k', 'retirement', 'pto', 'vacation',
    'remote work', 'flexible hours', 'mentorship', 'training', 'learning',
    'gym membership', 'free food', 'snacks', 'coffee', 'relocation', 'stipend'
  ];
  
  const foundBenefits = [];
  
  for (const benefit of benefitKeywords) {
    if (cleanText.includes(benefit)) {
      foundBenefits.push(benefit.charAt(0).toUpperCase() + benefit.slice(1));
    }
  }
  
  // Add default benefits if none found
  if (foundBenefits.length === 0) {
    foundBenefits.push('Mentorship opportunities', 'Learning and development', 'Networking opportunities');
  }
  
  return foundBenefits;
}

// Helper function to extract deadline
function extractDeadline(cleanText) {
  const deadlinePatterns = [
    /(?:deadline|due|apply by|close(?:s|d)? on)\s*:?\s*([a-zA-Z]+ \d{1,2},? \d{4})/gi,
    /(?:deadline|due|apply by)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
    /(?:deadline|due|apply by)\s*:?\s*(\d{1,2}-\d{1,2}-\d{4})/gi
  ];
  
  for (const pattern of deadlinePatterns) {
    const match = pattern.exec(cleanText);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Not specified';
}

/**
 * Preprocess job text for better extraction
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned and structured text
 */
function preprocessJobText(text) {
  // Remove excessive whitespace and normalize line breaks
  let cleaned = text.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n');
  
  // Fix common OCR issues
  cleaned = cleaned.replace(/\bOoO\b/g, '000'); // Common OCR mistake
  cleaned = cleaned.replace(/\bl\b/g, 'I'); // lowercase l to uppercase I
  cleaned = cleaned.replace(/\b0\b/g, 'O'); // zero to letter O where appropriate
  
  // Normalize company name patterns
  cleaned = cleaned.replace(/(\w+)\s*careers?/gi, '$1 Careers');
  cleaned = cleaned.replace(/join\s+(\w+)/gi, 'Join $1');
  
  // Normalize job title patterns
  cleaned = cleaned.replace(/software\s+engineer/gi, 'Software Engineer');
  cleaned = cleaned.replace(/data\s+analyst/gi, 'Data Analyst');
  cleaned = cleaned.replace(/product\s+manager/gi, 'Product Manager');
  
  // Normalize location patterns
  cleaned = cleaned.replace(/remote\s*work/gi, 'Remote');
  cleaned = cleaned.replace(/work\s*from\s*home/gi, 'Remote');
  
  return cleaned.trim();
}

/**
 * Smart text truncation that preserves important job information
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Intelligently truncated text
 */
function smartTruncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  
  // Find important sections to preserve
  const importantSections = [];
  
  // Look for company names and job titles (usually at the beginning)
  const beginning = text.substring(0, Math.min(500, text.length));
  importantSections.push(beginning);
  
  // Look for requirements section
  const reqMatch = text.match(/(requirements?|qualifications?|skills?)[:\s]*([\s\S]{0,800})/i);
  if (reqMatch) {
    importantSections.push(reqMatch[0]);
  }
  
  // Look for application/contact info (usually at the end)
  const ending = text.substring(Math.max(0, text.length - 400));
  importantSections.push(ending);
  
  // Look for salary/compensation info
  const salaryMatch = text.match(/(salary|compensation|pay|wage|stipend)[:\s]*([\s\S]{0,200})/i);
  if (salaryMatch) {
    importantSections.push(salaryMatch[0]);
  }
  
  // Combine sections and truncate if still too long
  let combinedText = importantSections.join('\n\n');
  
  if (combinedText.length > maxLength) {
    combinedText = combinedText.substring(0, maxLength - 3) + '...';
  }
  
  return combinedText;
}

/**
 * Detect the source type of the job posting
 * @param {string} text - Input text
 * @returns {string} - Source type
 */
function detectSourceType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('linkedin') || lowerText.includes('linkedin.com')) {
    return 'LinkedIn';
  }
  if (lowerText.includes('indeed') || lowerText.includes('indeed.com')) {
    return 'Indeed';
  }
  if (lowerText.includes('glassdoor')) {
    return 'Glassdoor';
  }
  if (lowerText.includes('from:') || lowerText.includes('to:') || lowerText.includes('subject:')) {
    return 'Email';
  }
  if (lowerText.includes('careers') || lowerText.includes('jobs')) {
    return 'Company Career Page';
  }
  if (lowerText.includes('handshake')) {
    return 'Handshake';
  }
  
  return 'Job Board/Website';
}

// Enhanced helper function to extract contact info
function extractContactInfo(text) {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phonePattern = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
  const linkedinPattern = /linkedin\.com\/in\/[\w-]+/gi;
  
  const contacts = [];
  
  let emailMatch;
  while ((emailMatch = emailPattern.exec(text)) !== null) {
    contacts.push(`Email: ${emailMatch[0]}`);
  }
  
  let phoneMatch;
  while ((phoneMatch = phonePattern.exec(text)) !== null) {
    contacts.push(`Phone: ${phoneMatch[0]}`);
  }
  
  let linkedinMatch;
  while ((linkedinMatch = linkedinPattern.exec(text)) !== null) {
    contacts.push(`LinkedIn: ${linkedinMatch[0]}`);
  }
  
  return contacts.length > 0 ? contacts.join(', ') : 'Not specified';
}

/**
 * Calculate confidence score for job extraction
 * @param {Object} jobInfo - Extracted job information
 * @returns {string} - Confidence level
 */
function calculateExtractionConfidence(jobInfo) {
  let score = 0;
  let maxScore = 10;
  
  // Company name found
  if (jobInfo.company && jobInfo.company !== 'Unknown Company' && jobInfo.company !== 'Not specified') {
    score += 2;
  }
  
  // Job title found
  if (jobInfo.jobTitle && jobInfo.jobTitle !== 'Position Not Specified' && jobInfo.jobTitle !== 'Not specified') {
    score += 2;
  }
  
  // Location found
  if (jobInfo.location && jobInfo.location !== 'Location Not Specified' && jobInfo.location !== 'Not specified') {
    score += 1;
  }
  
  // Requirements found
  if (jobInfo.requirements && (
    (Array.isArray(jobInfo.requirements.technical) && jobInfo.requirements.technical.length > 0) ||
    (Array.isArray(jobInfo.requirements.education) && jobInfo.requirements.education.length > 0)
  )) {
    score += 2;
  }
  
  // Salary/compensation found
  if (jobInfo.salary && jobInfo.salary !== 'Not specified') {
    score += 1;
  }
  
  // Contact information found
  if (jobInfo.applicationInfo?.contact && jobInfo.applicationInfo.contact !== 'Not specified') {
    score += 1;
  }
  
  // Skills found
  if (Array.isArray(jobInfo.skills) && jobInfo.skills.length > 0) {
    score += 1;
  }
  
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 80) return 'High';
  if (percentage >= 60) return 'Medium';
  if (percentage >= 40) return 'Low';
  return 'Very Low';
}

// Additional helper functions for enhanced mock extraction
function extractWorkArrangement(cleanText) {
  if (cleanText.includes('remote')) return 'Remote';
  if (cleanText.includes('hybrid')) return 'Hybrid';
  if (cleanText.includes('on-site') || cleanText.includes('onsite')) return 'On-site';
  return 'Not specified';
}

function extractDuration(cleanText) {
  const durationPatterns = [
    /(\d+)\s*(month|months|week|weeks)/gi,
    /(summer|fall|spring|winter)\s*(internship|intern)/gi,
    /(full-time|part-time|temporary|contract)/gi
  ];
  
  for (const pattern of durationPatterns) {
    const match = cleanText.match(pattern);
    if (match) return match[0];
  }
  return 'Not specified';
}

function extractDepartment(cleanText) {
  const departments = ['engineering', 'product', 'marketing', 'sales', 'design', 'data', 'research'];
  for (const dept of departments) {
    if (cleanText.includes(dept)) return dept.charAt(0).toUpperCase() + dept.slice(1);
  }
  return 'Not specified';
}

function extractSeniority(cleanText) {
  if (cleanText.includes('intern') || cleanText.includes('internship')) return 'Entry-level';
  if (cleanText.includes('junior')) return 'Junior';
  if (cleanText.includes('senior')) return 'Senior';
  if (cleanText.includes('lead') || cleanText.includes('principal')) return 'Lead';
  if (cleanText.includes('director') || cleanText.includes('manager')) return 'Director';
  return 'Entry-level';
}

function extractEducationRequirements(cleanText) {
  const requirements = [];
  if (cleanText.includes('bachelor') || cleanText.includes('bs') || cleanText.includes('ba')) {
    requirements.push('Bachelor\'s degree');
  }
  if (cleanText.includes('master') || cleanText.includes('ms') || cleanText.includes('ma')) {
    requirements.push('Master\'s degree');
  }
  if (cleanText.includes('phd') || cleanText.includes('doctorate')) {
    requirements.push('PhD');
  }
  if (cleanText.includes('gpa')) {
    requirements.push('Minimum GPA requirement');
  }
  return requirements.length > 0 ? requirements : ['Not specified'];
}

function extractExperienceRequirements(cleanText) {
  const expMatch = cleanText.match(/(\d+)\s*(year|years)\s*(experience|exp)/gi);
  if (expMatch) return [expMatch[0]];
  if (cleanText.includes('entry level') || cleanText.includes('no experience')) {
    return ['Entry level - no experience required'];
  }
  return ['Not specified'];
}

function extractSoftSkills(cleanText) {
  const softSkills = [];
  const skillsMap = {
    'communication': 'Communication skills',
    'teamwork': 'Teamwork',
    'leadership': 'Leadership',
    'problem solving': 'Problem solving',
    'analytical': 'Analytical thinking',
    'creative': 'Creativity',
    'detail oriented': 'Attention to detail'
  };
  
  for (const [key, value] of Object.entries(skillsMap)) {
    if (cleanText.includes(key)) softSkills.push(value);
  }
  return softSkills.length > 0 ? softSkills : ['Not specified'];
}

function extractResponsibilities(cleanText) {
  const responsibilities = [];
  const responsibilityKeywords = [
    'develop', 'build', 'create', 'design', 'implement', 'maintain',
    'collaborate', 'work with', 'participate', 'contribute', 'support'
  ];
  
  for (const keyword of responsibilityKeywords) {
    if (cleanText.includes(keyword)) {
      responsibilities.push(`${keyword.charAt(0).toUpperCase() + keyword.slice(1)} software solutions`);
      break;
    }
  }
  return responsibilities.length > 0 ? responsibilities : ['Not specified'];
}

function extractIndustry(cleanText) {
  const industries = {
    'tech': 'Technology',
    'software': 'Technology',
    'fintech': 'Financial Technology',
    'finance': 'Finance',
    'healthcare': 'Healthcare',
    'education': 'Education',
    'retail': 'Retail',
    'startup': 'Technology'
  };
  
  for (const [key, value] of Object.entries(industries)) {
    if (cleanText.includes(key)) return value;
  }
  return 'Not specified';
}

function extractStartDate(cleanText) {
  const datePatterns = [
    /(summer|fall|spring|winter)\s*(\d{4})/gi,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})/gi,
    /start.*(\d{1,2}\/\d{1,2}\/\d{4})/gi
  ];
  
  for (const pattern of datePatterns) {
    const match = cleanText.match(pattern);
    if (match) return match[0];
  }
  return 'Not specified';
}

// Helper function to generate job description
function generateJobDescription(title, company) {
  if (company === 'Company not specified' && title === 'Software Development Internship') {
    return 'Exciting internship opportunity to gain hands-on experience in software development.';
  }
  
  return `Join ${company} as a ${title} and contribute to innovative projects while developing your skills.`;
}

/**
 * Enhanced job information extraction from text using AI
 * @param {string} text - The extracted text from the image
 * @returns {Promise<Object>} - Comprehensive job information object
 */
async function extractJobInformation(text) {
  try {
    console.log('Analyzing text with enhanced AI extraction...');
    
    // Preprocess text for better extraction
    const cleanedText = preprocessJobText(text);
    
    // Truncate text smartly, keeping important sections
    const maxLength = 3000;
    const truncatedText = smartTruncateText(cleanedText, maxLength);
    
    const prompt = `You are an expert AI specialized in extracting detailed job information from websites, emails, and job postings. You excel at identifying company names, job titles, and requirements even from complex layouts.

ADVANCED EXTRACTION RULES:
1. COMPANY IDENTIFICATION:
   - Look for company logos, headers, "About [Company]", "Join [Company]", domain names in emails
   - Check email signatures, sender information
   - Look for phrases like "We are [Company]", "[Company] is hiring", company social media handles
   - Extract from URLs like careers.company.com, company.com/jobs

2. JOB TITLE PRECISION:
   - Identify exact position titles including level (Junior, Senior, Lead)
   - Distinguish between internships, full-time, part-time, contract roles
   - Look for department/team information (Frontend Engineer, Backend Developer, etc.)

3. LOCATION INTELLIGENCE:
   - Parse "Remote", "Hybrid", "On-site" specifications
   - Extract specific addresses, cities, states, countries
   - Identify timezone requirements, travel expectations

4. COMPENSATION ANALYSIS:
   - Extract salary ranges, hourly rates, stipends
   - Identify equity, bonuses, commission structures
   - Look for "unpaid", "volunteer", "academic credit" indicators

5. REQUIREMENTS EXTRACTION:
   - Education: Degree requirements, GPA, school year
   - Experience: Years required, specific industry experience
   - Technical skills: Programming languages, frameworks, tools
   - Soft skills: Communication, leadership, teamwork

6. APPLICATION DETAILS:
   - Deadlines: "Apply by", "Applications due", rolling basis
   - Process: Interview stages, assessment requirements
   - Contact: Recruiter emails, application portals, phone numbers

7. COMPANY CULTURE & BENEFITS:
   - Work environment, company values, team structure
   - Health benefits, PTO, retirement plans
   - Learning opportunities, mentorship, career growth

TEXT TO ANALYZE:
${truncatedText}

CONTEXT HINTS:
- Source type: ${detectSourceType(text)}
- Text length: ${text.length} characters
- Contains URLs: ${/https?:\/\//.test(text)}
- Contains email patterns: ${/@/.test(text)}

Return a comprehensive JSON object with ALL available information:
{
  "company": "Full company name with proper capitalization",
  "jobTitle": "Complete job title with level/department",
  "location": "Detailed location (city, state, remote options)",
  "workArrangement": "Remote|Hybrid|On-site|Flexible",
  "salary": "Full compensation details including range, benefits",
  "jobType": "Internship|Full-time|Part-time|Contract|Temporary",
  "duration": "Length of internship/contract if specified",
  "department": "Engineering|Product|Marketing|Sales|Other",
  "seniority": "Entry-level|Junior|Mid-level|Senior|Lead|Director",
  "requirements": {
    "education": ["degree requirements", "GPA", "school year"],
    "experience": ["years required", "specific experience"],
    "technical": ["programming languages", "frameworks", "tools"],
    "soft": ["communication", "leadership", "collaboration"]
  },
  "responsibilities": ["main job duties", "project types", "team interactions"],
  "skills": ["technical skills", "tools", "languages", "frameworks"],
  "qualifications": ["must-have qualifications", "nice-to-have skills"],
  "description": "Comprehensive 2-3 sentence job summary",
  "applicationInfo": {
    "deadline": "Application deadline if mentioned",
    "process": "Interview process details",
    "contact": "Recruiter email or contact info",
    "applyUrl": "Application URL if found"
  },
  "benefits": ["health insurance", "PTO", "remote work", "learning opportunities"],
  "companyInfo": {
    "industry": "Tech|Finance|Healthcare|Other",
    "size": "Startup|Small|Medium|Large|Enterprise",
    "description": "Brief company description"
  },
  "additionalInfo": {
    "startDate": "When position starts",
    "timezone": "Required timezone if mentioned",
    "travelRequired": "Travel requirements",
    "securityClearance": "Security clearance if required"
  }
}

CRITICAL: Return ONLY the JSON object. Extract ALL available information, use "Not specified" only when truly unavailable.`;

    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini', // Using GPT-4 for better extraction accuracy
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert AI specialized in extracting comprehensive job information from various sources including websites, emails, and job boards. You excel at identifying subtle details and extracting structured data from unstructured text. Always return valid JSON with all available information.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.05, // Very low temperature for consistent extraction
      max_tokens: 2000 // Increased for comprehensive extraction
    });

    const content = response.choices[0].message.content.trim();
    console.log('AI Response preview:', content.substring(0, 200) + '...');
    
    // Try to parse the comprehensive JSON response
    try {
      // Find JSON in the response if it's not pure JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      
      const jobInfo = JSON.parse(jsonString);
      
      // Validate and structure the comprehensive response
      const comprehensiveJobInfo = {
        // Basic Information
        company: jobInfo.company || 'Unknown Company',
        jobTitle: jobInfo.jobTitle || 'Position Not Specified',
        location: jobInfo.location || 'Location Not Specified',
        workArrangement: jobInfo.workArrangement || 'Not specified',
        salary: jobInfo.salary || 'Not specified',
        jobType: jobInfo.jobType || 'Not specified',
        duration: jobInfo.duration || 'Not specified',
        department: jobInfo.department || 'Not specified',
        seniority: jobInfo.seniority || 'Not specified',
        
        // Detailed Requirements
        requirements: {
          education: Array.isArray(jobInfo.requirements?.education) ? jobInfo.requirements.education : [],
          experience: Array.isArray(jobInfo.requirements?.experience) ? jobInfo.requirements.experience : [],
          technical: Array.isArray(jobInfo.requirements?.technical) ? jobInfo.requirements.technical : [],
          soft: Array.isArray(jobInfo.requirements?.soft) ? jobInfo.requirements.soft : []
        },
        
        // Job Details
        responsibilities: Array.isArray(jobInfo.responsibilities) ? jobInfo.responsibilities : [],
        skills: Array.isArray(jobInfo.skills) ? jobInfo.skills : [],
        qualifications: Array.isArray(jobInfo.qualifications) ? jobInfo.qualifications : [],
        description: jobInfo.description || generateJobDescription(jobInfo.jobTitle || 'Position', jobInfo.company || 'Company'),
        
        // Application Information
        applicationInfo: {
          deadline: jobInfo.applicationInfo?.deadline || 'Not specified',
          process: jobInfo.applicationInfo?.process || 'Not specified',
          contact: jobInfo.applicationInfo?.contact || extractContactInfo(text),
          applyUrl: jobInfo.applicationInfo?.applyUrl || 'Not specified'
        },
        
        // Benefits and Company Info
        benefits: Array.isArray(jobInfo.benefits) ? jobInfo.benefits : [],
        companyInfo: {
          industry: jobInfo.companyInfo?.industry || 'Not specified',
          size: jobInfo.companyInfo?.size || 'Not specified',
          description: jobInfo.companyInfo?.description || 'Not specified'
        },
        
        // Additional Details
        additionalInfo: {
          startDate: jobInfo.additionalInfo?.startDate || 'Not specified',
          timezone: jobInfo.additionalInfo?.timezone || 'Not specified',
          travelRequired: jobInfo.additionalInfo?.travelRequired || 'Not specified',
          securityClearance: jobInfo.additionalInfo?.securityClearance || 'Not specified'
        },
        
        // Metadata
        extractionMetadata: {
          sourceType: detectSourceType(text),
          textLength: text.length,
          extractionDate: new Date().toISOString(),
          confidence: calculateExtractionConfidence(jobInfo)
        }
      };
      
      console.log('Comprehensive job extraction successful:', {
        company: comprehensiveJobInfo.company,
        title: comprehensiveJobInfo.jobTitle,
        confidence: comprehensiveJobInfo.extractionMetadata.confidence
      });
      
      return comprehensiveJobInfo;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('AI Response:', content);
      return createMockJobInfo(text);
    }
  } catch (error) {
    console.error('Error extracting job information:', error);
    
    // Return mock data instead of failing
    console.log('Falling back to mock job information');
    return createMockJobInfo(text);
  }
}

module.exports = {
  extractTextFromImage,
  extractJobInformation
}; 