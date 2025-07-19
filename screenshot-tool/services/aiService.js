const { OpenAI } = require('openai');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
  apiKey: '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',
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
 * Extract job information from text using OpenRouter
 * @param {string} text - Text extracted from the image
 * @returns {Promise<Object>} - Structured job information
 */
async function extractJobInformation(text) {
  try {
    console.log('Analyzing text with OpenRouter...');
    
    // Limit the text to reduce token usage
    const truncatedText = text.substring(0, 2000);
    
    const prompt = `
Extract job information from this text. Return ONLY a JSON object with these fields (use null for missing information):
- companyName: Company name
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
      const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || 
                        content.match(/```\n([\s\S]*)\n```/) || 
                        content.match(/\{[\s\S]*\}/);
      
      const jsonString = jsonMatch ? jsonMatch[0].replace(/```json\n|```\n|```/g, '') : content;
      const jobData = JSON.parse(jsonString);
      
      console.log('Successfully extracted job information');
      return jobData;
    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError);
      console.log('Raw AI response:', content);
      throw new Error('Failed to parse job information from AI response');
    }
  } catch (error) {
    console.error('Error extracting job information:', error);
    throw error;
  }
}

module.exports = {
  extractTextFromImage,
  extractJobInformation
}; 