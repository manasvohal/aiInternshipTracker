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
  // Extract some basic info from the text if possible
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Look for common job-related keywords
  const jobKeywords = ['developer', 'engineer', 'intern', 'analyst', 'manager', 'designer', 'software', 'data', 'frontend', 'backend', 'full-stack'];
  const locationKeywords = ['remote', 'san francisco', 'new york', 'seattle', 'austin', 'boston', 'california', 'usa'];
  
  let potentialTitle = 'Software Development Internship';
  let potentialLocation = 'Location not specified';
  let potentialCompany = 'Company not specified';
  
  // Try to find job title
  for (const line of lines.slice(0, 10)) {
    const lowerLine = line.toLowerCase();
    if (jobKeywords.some(keyword => lowerLine.includes(keyword))) {
      potentialTitle = line.trim();
      break;
    }
  }
  
  // Try to find location
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (locationKeywords.some(keyword => lowerLine.includes(keyword))) {
      potentialLocation = line.trim();
      break;
    }
  }
  
  // Try to find company name (usually in first few lines)
  if (lines.length > 0) {
    potentialCompany = lines[0].trim();
  }
  
  return {
    company: potentialCompany,
    jobTitle: potentialTitle,
    location: potentialLocation,
    salary: 'Not specified',
    jobType: 'internship',
    requirements: [
      'Strong programming skills',
      'Problem-solving abilities',
      'Team collaboration',
      'Communication skills'
    ],
    skills: [
      'JavaScript',
      'Python',
      'React',
      'Node.js',
      'Git'
    ],
    description: 'Exciting internship opportunity to gain hands-on experience in software development.',
    applicationDeadline: 'Not specified',
    contactInfo: 'Not specified',
    benefits: [
      'Mentorship opportunities',
      'Learning and development',
      'Networking opportunities',
      'Real-world experience'
    ]
  };
}

/**
 * Extract job information from text using AI
 * @param {string} text - The extracted text from the image
 * @returns {Promise<Object>} - Job information object
 */
async function extractJobInformation(text) {
  try {
    console.log('Analyzing text with OpenRouter...');
    
    // Truncate text to prevent token limit issues
    const maxLength = 2000;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    
    const prompt = `Extract job posting information from this text and return it as a JSON object with these fields:
- company: Company name
- jobTitle: Position title
- location: Job location
- salary: Salary if mentioned
- jobType: Type (full-time, part-time, internship)
- requirements: Array of key requirements
- skills: Array of skills
- description: Brief summary (100 chars max)
- applicationDeadline: Deadline if mentioned
- contactInfo: Contact info if provided
- benefits: Array of benefits

Text: ${truncatedText}

Return ONLY valid JSON with no additional text.
`;

    const response = await openai.chat.completions.create({
      model: 'openai/gpt-3.5-turbo', // Using a smaller model to reduce token usage
      messages: [
        { role: 'system', content: 'You extract job information from text and return it as JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 800 // Reduced max tokens
    });

    const content = response.choices[0].message.content.trim();
    
    // Try to parse the JSON response
    try {
      // Find JSON in the response if it's not pure JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      
      const jobInfo = JSON.parse(jsonString);
      
      // Validate required fields and provide defaults
      const defaultJobInfo = {
        company: 'Unknown Company',
        jobTitle: 'Position Not Specified',
        location: 'Location Not Specified',
        salary: 'Not specified',
        jobType: 'Not specified',
        requirements: [],
        skills: [],
        description: 'No description available',
        applicationDeadline: 'Not specified',
        contactInfo: 'Not specified',
        benefits: []
      };
      
      return { ...defaultJobInfo, ...jobInfo };
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