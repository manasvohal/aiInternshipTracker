const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// Load OCR configuration
let ocrConfig;
try {
  ocrConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ocr-config.json'), 'utf8'));
} catch (error) {
  console.warn('⚠️ OCR config not found, using defaults');
  ocrConfig = getDefaultOCRConfig();
}

/**
 * ULTIMATE TESSERACT OCR SYSTEM
 * Advanced multi-pass OCR with intelligent preprocessing and result merging
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} - Comprehensive OCR results
 */
async function extractTextFromImage(imagePath) {
  try {
    console.log('🚀 ULTIMATE TESSERACT OCR SYSTEM STARTING');
    console.log(`📁 Processing: ${path.basename(imagePath)}`);
    
    const startTime = Date.now();
    
    // Step 1: Image Analysis & Optimization
    const imageAnalysis = await analyzeImage(imagePath);
    console.log(`📊 Image Analysis: ${imageAnalysis.width}x${imageAnalysis.height}, ${imageAnalysis.type}`);
    
    // Step 2: Create Optimized Image Variants
    const imageVariants = await createOptimizedImageVariants(imagePath, imageAnalysis);
    console.log(`🔧 Created ${imageVariants.length} optimized variants`);
    
    // Step 3: Run Multiple OCR Passes with Different Configurations
    const ocrResults = await runAdvancedOCRPasses(imageVariants, imageAnalysis);
    console.log(`🔍 Completed ${ocrResults.length} OCR passes`);
    
    // Step 4: Intelligent Result Merging
    const mergedResult = await intelligentResultMerging(ocrResults);
    console.log(`🧠 Merged results: ${mergedResult.confidence}% confidence`);
    
    // Step 5: Advanced Post-Processing
    const finalText = await advancedPostProcessing(mergedResult.text, imageAnalysis);
    console.log(`✨ Post-processing complete: ${finalText.length} characters`);
    
    // Step 6: Quality Assessment
    const qualityMetrics = calculateAdvancedQualityMetrics(ocrResults, finalText, startTime);
    
    // Step 7: Cleanup
    await cleanupImageVariants(imageVariants);
    
    const result = {
      text: finalText,
      originalText: mergedResult.text,
      confidence: Math.round(mergedResult.confidence),
      wordCount: finalText.split(/\s+/).filter(w => w.length > 0).length,
      characterCount: finalText.length,
      qualityMetrics,
      imageAnalysis,
      metadata: {
        imagePath,
        processedAt: new Date().toISOString(),
        ocrEngine: 'Ultimate Tesseract',
        variants: imageVariants.length,
        passes: ocrResults.length,
        processingTime: Date.now() - startTime
      }
    };
    
    console.log('✅ ULTIMATE OCR COMPLETE');
    console.log(`📊 Final Stats: ${result.wordCount} words, ${result.confidence}% confidence, ${result.qualityMetrics.quality}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Ultimate OCR failed:', error);
    return await basicOCRFallback(imagePath);
  }
}

/**
 * Analyze image properties to optimize OCR approach
 */
async function analyzeImage(imagePath) {
  const stats = fs.statSync(imagePath);
  
  let analysis = {
    size: stats.size,
    type: 'unknown',
    width: 0,
    height: 0,
    hasText: true,
    complexity: 'medium',
    recommendedProfile: 'job_posting'
  };
  
  try {
    const sharp = require('sharp');
    const metadata = await sharp(imagePath).metadata();
    
    analysis.width = metadata.width;
    analysis.height = metadata.height;
    analysis.format = metadata.format;
    analysis.channels = metadata.channels;
    analysis.density = metadata.density || 72;
    
    // Determine image type and complexity
    const aspectRatio = metadata.width / metadata.height;
    const pixelCount = metadata.width * metadata.height;
    
    if (aspectRatio > 2 || aspectRatio < 0.5) {
      analysis.complexity = 'high'; // Unusual aspect ratio
    }
    
    if (pixelCount < 100000) {
      analysis.complexity = 'low'; // Small image
    } else if (pixelCount > 2000000) {
      analysis.complexity = 'high'; // Large image
    }
    
    // Detect likely content type
    if (metadata.width > 800 && aspectRatio > 1.2) {
      analysis.type = 'webpage';
      analysis.recommendedProfile = 'job_posting';
    } else if (aspectRatio < 0.8 && metadata.height > 600) {
      analysis.type = 'mobile';
      analysis.recommendedProfile = 'linkedin';
    } else if (aspectRatio > 1.5) {
      analysis.type = 'document';
      analysis.recommendedProfile = 'pdf_document';
    }
    
  } catch (error) {
    console.warn('⚠️ Sharp analysis failed, using basic analysis');
  }
  
  return analysis;
}

/**
 * Create multiple optimized image variants for different OCR scenarios
 */
async function createOptimizedImageVariants(imagePath, analysis) {
  const variants = [];
  const tempDir = path.join(require('os').tmpdir(), 'ultimate_ocr');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  
  try {
    const sharp = require('sharp');
    
    // Variant 1: Original Enhanced
    const originalPath = path.join(tempDir, `original_${timestamp}.png`);
    await sharp(imagePath)
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(originalPath);
    variants.push({
      path: originalPath,
      name: 'original',
      description: 'Original high-quality',
      ocrConfig: { psm: 6, oem: 3 }
    });
    
    // Variant 2: Ultra High Contrast
    const contrastPath = path.join(tempDir, `contrast_${timestamp}.png`);
    await sharp(imagePath)
      .normalize()
      .linear(2.0, -(128 * 2.0) + 128) // Extreme contrast
      .sharpen({ sigma: 1.5, flat: 1, jagged: 3 })
      .threshold(140) // Binary threshold
      .png({ quality: 100 })
      .toFile(contrastPath);
    variants.push({
      path: contrastPath,
      name: 'ultra_contrast',
      description: 'Ultra high contrast binary',
      ocrConfig: { psm: 6, oem: 1 }
    });
    
    // Variant 3: Adaptive Threshold
    const adaptivePath = path.join(tempDir, `adaptive_${timestamp}.png`);
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .blur(0.5) // Slight blur to smooth noise
      .linear(1.8, -50) // Adjust contrast and brightness
      .sharpen({ sigma: 2 })
      .png({ quality: 100 })
      .toFile(adaptivePath);
    variants.push({
      path: adaptivePath,
      name: 'adaptive',
      description: 'Adaptive threshold enhanced',
      ocrConfig: { psm: 3, oem: 3 }
    });
    
    // Variant 4: Super Resolution (for small text)
    const scaleFactor = calculateOptimalScale(analysis);
    const superResPath = path.join(tempDir, `superres_${timestamp}.png`);
    await sharp(imagePath)
      .resize(
        Math.round(analysis.width * scaleFactor),
        Math.round(analysis.height * scaleFactor),
        { kernel: sharp.kernel.lanczos3 }
      )
      .sharpen({ sigma: 1, flat: 1, jagged: 2 })
      .normalize()
      .png({ quality: 100 })
      .toFile(superResPath);
    variants.push({
      path: superResPath,
      name: 'super_resolution',
      description: `Super resolution ${scaleFactor}x`,
      ocrConfig: { psm: 6, oem: 3 }
    });
    
    // Variant 5: Morphological Operations
    const morphPath = path.join(tempDir, `morph_${timestamp}.png`);
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 9, -1, -1, -1, -1] // Sharpening kernel
      })
      .linear(1.5, -30)
      .png({ quality: 100 })
      .toFile(morphPath);
    variants.push({
      path: morphPath,
      name: 'morphological',
      description: 'Morphological enhancement',
      ocrConfig: { psm: 11, oem: 1 }
    });
    
    // Variant 6: Edge-Preserved Smoothing
    const edgePath = path.join(tempDir, `edge_${timestamp}.png`);
    await sharp(imagePath)
      .median(3) // Median filter for noise reduction
      .normalize()
      .sharpen({ sigma: 2, flat: 1, jagged: 2 })
      .linear(1.3, -20)
      .png({ quality: 100 })
      .toFile(edgePath);
    variants.push({
      path: edgePath,
      name: 'edge_preserved',
      description: 'Edge-preserved smoothing',
      ocrConfig: { psm: 8, oem: 3 }
    });
    
    console.log(`✅ Created ${variants.length} advanced image variants`);
    return variants;
    
  } catch (error) {
    console.warn('⚠️ Advanced preprocessing failed, using basic variants');
    return await createBasicImageVariants(imagePath, tempDir, timestamp);
  }
}

/**
 * Calculate optimal scaling factor based on image analysis
 */
function calculateOptimalScale(analysis) {
  const minDimension = Math.min(analysis.width, analysis.height);
  
  if (minDimension < 500) return 3.0;      // Very small images
  if (minDimension < 800) return 2.5;      // Small images  
  if (minDimension < 1200) return 2.0;     // Medium images
  if (minDimension < 1600) return 1.5;     // Large images
  return 1.2; // Very large images
}

/**
 * Create basic image variants when Sharp is not available
 */
async function createBasicImageVariants(imagePath, tempDir, timestamp) {
  const variants = [];
  
  // Create multiple copies with different OCR configurations
  const configs = [
    { psm: 6, oem: 3, name: 'standard', description: 'Standard text blocks' },
    { psm: 3, oem: 1, name: 'full_page', description: 'Full page analysis' },
    { psm: 8, oem: 3, name: 'single_word', description: 'Single word focus' },
    { psm: 7, oem: 1, name: 'single_line', description: 'Single text line' },
    { psm: 11, oem: 3, name: 'sparse', description: 'Sparse text' },
    { psm: 13, oem: 1, name: 'raw_line', description: 'Raw line text' }
  ];
  
  for (const config of configs) {
    const variantPath = path.join(tempDir, `${config.name}_${timestamp}.png`);
    fs.copyFileSync(imagePath, variantPath);
    
    variants.push({
      path: variantPath,
      name: config.name,
      description: config.description,
      ocrConfig: { psm: config.psm, oem: config.oem }
    });
  }
  
  return variants;
}

/**
 * Run advanced OCR passes with optimized Tesseract configurations
 */
async function runAdvancedOCRPasses(imageVariants, analysis) {
  console.log(`🔍 Running ${imageVariants.length} advanced OCR passes...`);
  
  const results = [];
  
  for (let i = 0; i < imageVariants.length; i++) {
    const variant = imageVariants[i];
    
    try {
      console.log(`📖 Pass ${i + 1}/${imageVariants.length}: ${variant.description}`);
      
      // Advanced Tesseract configuration
      const tesseractConfig = {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            if (progress % 20 === 0) {
              console.log(`   Progress: ${progress}%`);
            }
          }
        },
        
        // Page segmentation mode
        tessedit_pageseg_mode: variant.ocrConfig.psm,
        
        // OCR Engine Mode
        tessedit_ocr_engine_mode: variant.ocrConfig.oem,
        
        // Character whitelist (optimized for job postings)
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%^&*()_+-=[]{}|;:\'",.<>/\\`~ \n\t€£¥$',
        
        // Advanced Tesseract parameters
        preserve_interword_spaces: '1',
        tessedit_do_invert: '0',
        textord_really_old_xheight: '1',
        textord_min_linesize: '1.25',
        
        // Quality settings
        tessedit_write_images: '0',
        tessedit_create_pdf: '0',
        tessedit_create_hocr: '0',
        
        // Language model settings
        load_system_dawg: '1',
        load_freq_dawg: '1',
        load_unambig_dawg: '1',
        load_punc_dawg: '1',
        load_number_dawg: '1',
        
        // Confidence thresholds
        tessedit_reject_mode: '0',
        classify_bln_numeric_mode: '0',
        
        // Advanced recognition settings
        textord_single_height_wds: '1',
        textord_use_cjk_fp_model: '0',
        segment_segcost_rating: '1',
        
        // Noise reduction
        textord_noise_normratio: '2',
        textord_noise_translimit: '16',
        textord_noise_sncount: '1'
      };
      
      const result = await Tesseract.recognize(variant.path, 'eng', tesseractConfig);
      
      const confidence = Math.round(result.data.confidence);
      const text = result.data.text;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      
      // Extract detailed word-level data
      const words = result.data.words || [];
      const lines = result.data.lines || [];
      const paragraphs = result.data.paragraphs || [];
      
      console.log(`   ✅ Result: ${wordCount} words, ${confidence}% confidence`);
      
      results.push({
        text,
        confidence,
        wordCount,
        variant: variant.name,
        description: variant.description,
        words,
        lines,
        paragraphs,
        bbox: result.data.bbox,
        processingTime: Date.now()
      });
      
    } catch (error) {
      console.error(`❌ OCR pass ${i + 1} failed:`, error.message);
      results.push({
        text: '',
        confidence: 0,
        wordCount: 0,
        variant: variant.name,
        description: variant.description,
        error: error.message
      });
    }
  }
  
  // Sort results by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  
  console.log('📊 OCR Pass Results:');
  results.forEach((result, i) => {
    if (result.confidence > 0) {
      console.log(`   ${i + 1}. ${result.description}: ${result.confidence}% (${result.wordCount} words)`);
    }
  });
  
  return results.filter(r => r.confidence > 0);
}

/**
 * Intelligent merging of multiple OCR results
 */
async function intelligentResultMerging(ocrResults) {
  console.log('🧠 Performing intelligent result merging...');
  
  if (ocrResults.length === 0) {
    throw new Error('No valid OCR results to merge');
  }
  
  if (ocrResults.length === 1) {
    return {
      text: ocrResults[0].text,
      confidence: ocrResults[0].confidence,
      method: 'single_result'
    };
  }
  
  // Strategy 1: Confidence-weighted merging
  const topResults = ocrResults.slice(0, Math.min(3, ocrResults.length));
  let mergedText = topResults[0].text; // Start with best result
  
  // Strategy 2: Word-level confidence merging
  if (topResults.length > 1 && topResults[0].words && topResults[0].words.length > 0) {
    mergedText = await wordLevelMerging(topResults);
  }
  
  // Strategy 3: Line-level validation
  mergedText = await lineValidation(mergedText, topResults);
  
  // Calculate merged confidence
  const weightedConfidence = topResults.reduce((sum, result, index) => {
    const weight = 1 / (index + 1); // Decreasing weight
    return sum + (result.confidence * weight);
  }, 0) / topResults.reduce((sum, _, index) => sum + (1 / (index + 1)), 0);
  
  console.log(`✅ Merged ${topResults.length} results with ${Math.round(weightedConfidence)}% confidence`);
  
  return {
    text: mergedText,
    confidence: weightedConfidence,
    method: 'intelligent_merge',
    sourceResults: topResults.length
  };
}

/**
 * Advanced word-level merging using confidence scores
 */
async function wordLevelMerging(results) {
  console.log('🔤 Performing word-level confidence merging...');
  
  const primaryResult = results[0];
  let improvedText = primaryResult.text;
  let improvements = 0;
  
  if (!primaryResult.words || primaryResult.words.length === 0) {
    return improvedText;
  }
  
  // Find low-confidence words and try to improve them
  for (const word of primaryResult.words) {
    if (word.confidence < 75 && word.text.length > 2) {
      // Look for better alternatives
      for (let i = 1; i < results.length; i++) {
        const altResult = results[i];
        if (altResult.words) {
          const betterWord = findBetterWordMatch(word, altResult.words);
          if (betterWord && betterWord.confidence > word.confidence + 20) {
            improvedText = improvedText.replace(word.text, betterWord.text);
            improvements++;
            console.log(`   📝 Improved "${word.text}" → "${betterWord.text}" (${betterWord.confidence}%)`);
          }
        }
      }
    }
  }
  
  if (improvements > 0) {
    console.log(`✅ Made ${improvements} word-level improvements`);
  }
  
  return improvedText;
}

/**
 * Find better word match based on position and confidence
 */
function findBetterWordMatch(targetWord, alternativeWords) {
  if (!targetWord.bbox) return null;
  
  const threshold = 30; // Position matching threshold
  
  return alternativeWords.find(altWord => {
    if (!altWord.bbox) return false;
    
    const xDiff = Math.abs(altWord.bbox.x0 - targetWord.bbox.x0);
    const yDiff = Math.abs(altWord.bbox.y0 - targetWord.bbox.y0);
    
    return xDiff < threshold && 
           yDiff < threshold && 
           altWord.confidence > targetWord.confidence &&
           altWord.text.length > 1;
  });
}

/**
 * Line-level validation to ensure text coherence
 */
async function lineValidation(text, results) {
  console.log('📏 Performing line-level validation...');
  
  // For now, return the text as-is
  // Future enhancement: validate line structure across results
  return text;
}

/**
 * Advanced post-processing specifically optimized for job postings
 */
async function advancedPostProcessing(text, analysis) {
  console.log('✨ Advanced post-processing...');
  
  let processedText = text;
  
  // 1. Fix OCR character errors
  processedText = fixAdvancedOCRErrors(processedText);
  
  // 2. Job-specific corrections
  processedText = fixJobTerms(processedText);
  
  // 3. Email and URL corrections
  processedText = fixEmailsAndUrls(processedText);
  
  // 4. Normalize spacing and formatting
  processedText = normalizeAdvancedFormatting(processedText);
  
  // 5. Fix line breaks and paragraphs
  processedText = fixAdvancedLineBreaks(processedText);
  
  // 6. Remove OCR artifacts
  processedText = removeOCRArtifacts(processedText);
  
  // 7. Enhance readability
  processedText = enhanceReadability(processedText);
  
  console.log('✅ Advanced post-processing complete');
  return processedText;
}

/**
 * Fix advanced OCR character recognition errors
 */
function fixAdvancedOCRErrors(text) {
  const corrections = [
    // Advanced character substitutions
    [/rn/g, 'm'],
    [/\|(?=[a-z])/g, 'l'], // | before lowercase letters
    [/(?<=[a-z])\|/g, 'l'], // | after lowercase letters
    [/0(?=[a-zA-Z])/g, 'O'], // 0 before letters
    [/(?<=[a-zA-Z])0/g, 'o'], // 0 after letters
    [/5(?=[a-zA-Z])/g, 'S'], // 5 before letters
    [/1(?=[a-z])/g, 'l'], // 1 before lowercase
    [/8(?=[a-zA-Z])/g, 'B'], // 8 before letters
    [/6(?=[a-zA-Z])/g, 'G'], // 6 before letters (sometimes)
    
    // Common word fixes with word boundaries
    [/\bth e\b/gi, 'the'],
    [/\ban d\b/gi, 'and'],
    [/\bw ith\b/gi, 'with'],
    [/\bf or\b/gi, 'for'],
    [/\bt o\b/gi, 'to'],
    [/\bo f\b/gi, 'of'],
    [/\bi n\b/gi, 'in'],
    [/\bo n\b/gi, 'on'],
    [/\ba t\b/gi, 'at'],
    [/\bi s\b/gi, 'is'],
    [/\ba re\b/gi, 'are'],
    [/\bw e\b/gi, 'we'],
    [/\by ou\b/gi, 'you'],
    
    // Fix punctuation spacing
    [/ +\./g, '.'],
    [/ +,/g, ','],
    [/ +:/g, ':'],
    [/ +;/g, ';'],
    [/ +!/g, '!'],
    [/ +\?/g, '?'],
    [/\( +/g, '('],
    [/ +\)/g, ')'],
  ];
  
  let correctedText = text;
  for (const [pattern, replacement] of corrections) {
    correctedText = correctedText.replace(pattern, replacement);
  }
  
  return correctedText;
}

/**
 * Fix job-specific terms and phrases
 */
function fixJobTerms(text) {
  const jobCorrections = [
    // Job titles
    [/\bsoftwar e engineer\b/gi, 'Software Engineer'],
    [/\bsoftwar e developer\b/gi, 'Software Developer'],
    [/\bfrontend developer\b/gi, 'Frontend Developer'],
    [/\bbackend developer\b/gi, 'Backend Developer'],
    [/\bfull.?stack developer\b/gi, 'Full Stack Developer'],
    [/\bdata scientist\b/gi, 'Data Scientist'],
    [/\bdata analyst\b/gi, 'Data Analyst'],
    [/\bproduct manager\b/gi, 'Product Manager'],
    [/\bproject manager\b/gi, 'Project Manager'],
    [/\bux designer\b/gi, 'UX Designer'],
    [/\bui designer\b/gi, 'UI Designer'],
    [/\bdevops engineer\b/gi, 'DevOps Engineer'],
    
    // Common job terms
    [/\binternsh ip\b/gi, 'internship'],
    [/\bfull.?time\b/gi, 'full-time'],
    [/\bpart.?time\b/gi, 'part-time'],
    [/\bremot e\b/gi, 'remote'],
    [/\bon.?site\b/gi, 'on-site'],
    [/\bhybri d\b/gi, 'hybrid'],
    [/\bexperien ce\b/gi, 'experience'],
    [/\brequire d\b/gi, 'required'],
    [/\bqualificat ion\b/gi, 'qualification'],
    [/\bresponsibilit y\b/gi, 'responsibility'],
    [/\btechnolog y\b/gi, 'technology'],
    [/\bapplicat ion\b/gi, 'application'],
    [/\bopportun ity\b/gi, 'opportunity'],
    
    // Technical terms
    [/\bjavascript\b/gi, 'JavaScript'],
    [/\btypescript\b/gi, 'TypeScript'],
    [/\bnode\.?js\b/gi, 'Node.js'],
    [/\breact\.?js\b/gi, 'React.js'],
    [/\bangular\.?js\b/gi, 'Angular.js'],
    [/\bvue\.?js\b/gi, 'Vue.js'],
    [/\bgit hub\b/gi, 'GitHub'],
    [/\blinked in\b/gi, 'LinkedIn'],
  ];
  
  let correctedText = text;
  for (const [pattern, replacement] of jobCorrections) {
    correctedText = correctedText.replace(pattern, replacement);
  }
  
  return correctedText;
}

/**
 * Fix email addresses and URLs
 */
function fixEmailsAndUrls(text) {
  return text
    // Fix common email errors
    .replace(/@([a-zA-Z0-9.-]+)\.c0m/g, '@$1.com')
    .replace(/@([a-zA-Z0-9.-]+)\.c om/g, '@$1.com')
    .replace(/@([a-zA-Z0-9.-]+)\.co rn/g, '@$1.com')
    .replace(/@([a-zA-Z0-9.-]+)\.gmaii\.com/g, '@$1.gmail.com')
    
    // Fix URL errors
    .replace(/www\.([a-zA-Z0-9.-]+)\.c0m/g, 'www.$1.com')
    .replace(/https?:\/\/([a-zA-Z0-9.-]+)\.c0m/g, 'https://$1.com')
    
    // Fix spacing in emails
    .replace(/(\w+)@\s+(\w+)/g, '$1@$2')
    .replace(/(\w+)\s+@(\w+)/g, '$1@$2');
}

/**
 * Advanced formatting normalization
 */
function normalizeAdvancedFormatting(text) {
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    
    // Fix multiple spaces
    .replace(/[ \t]+/g, ' ')
    
    // Fix line spacing
    .replace(/\n +/g, '\n')
    .replace(/ +\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    
    // Fix bullet points
    .replace(/[•·▪▫◦‣⁃]/g, '•')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    
    // Fix quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    
    // Fix dashes
    .replace(/[–—]/g, '-')
    
    .trim();
}

/**
 * Advanced line break fixing
 */
function fixAdvancedLineBreaks(text) {
  return text
    // Join broken words (hyphenated line breaks)
    .replace(/([a-z])-\n([a-z])/g, '$1$2')
    
    // Join continuation lines
    .replace(/([a-z,])\n([a-z])/g, '$1 $2')
    
    // Preserve paragraph breaks after sentences
    .replace(/([.!?])\n([A-Z])/g, '$1\n\n$2')
    
    // Fix list items
    .replace(/\n•\s*/g, '\n• ')
    
    // Fix section headers
    .replace(/\n([A-Z][A-Z\s]+:)\n/g, '\n\n$1\n')
    
    // Clean up excessive line breaks
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Remove OCR artifacts and noise
 */
function removeOCRArtifacts(text) {
  return text
    // Remove single characters on their own lines
    .replace(/\n[a-zA-Z]\n/g, '\n')
    
    // Remove lines with only special characters
    .replace(/\n[^a-zA-Z0-9\s]+\n/g, '\n')
    
    // Remove excessive punctuation
    .replace(/[.]{4,}/g, '...')
    .replace(/[-]{3,}/g, '---')
    
    // Remove OCR confidence markers
    .replace(/\[\d+%\]/g, '')
    
    // Remove page numbers and headers/footers
    .replace(/\n\s*\d+\s*\n/g, '\n')
    .replace(/\nPage \d+.*\n/gi, '\n');
}

/**
 * Enhance text readability
 */
function enhanceReadability(text) {
  return text
    // Ensure proper spacing after punctuation
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .replace(/([,;:])([a-zA-Z])/g, '$1 $2')
    
    // Fix common abbreviations
    .replace(/\be\.g\.\s*/gi, 'e.g. ')
    .replace(/\bi\.e\.\s*/gi, 'i.e. ')
    .replace(/\betc\.\s*/gi, 'etc. ')
    
    // Ensure proper capitalization
    .replace(/\b(javascript|python|java|html|css|sql)\b/gi, match => match.toUpperCase())
    
    .trim();
}

/**
 * Calculate advanced quality metrics
 */
function calculateAdvancedQualityMetrics(ocrResults, finalText, startTime) {
  const validResults = ocrResults.filter(r => r.confidence > 0);
  
  if (validResults.length === 0) {
    return {
      confidence: 0,
      quality: 'failed',
      processingTime: Date.now() - startTime,
      details: 'No valid OCR results'
    };
  }
  
  const avgConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length;
  const maxConfidence = Math.max(...validResults.map(r => r.confidence));
  const minConfidence = Math.min(...validResults.map(r => r.confidence));
  const totalWords = finalText.split(/\s+/).filter(w => w.length > 0).length;
  const processingTime = Date.now() - startTime;
  
  // Advanced quality assessment
  let quality = 'poor';
  if (avgConfidence >= 85) quality = 'excellent';
  else if (avgConfidence >= 75) quality = 'very_good';
  else if (avgConfidence >= 65) quality = 'good';
  else if (avgConfidence >= 55) quality = 'fair';
  
  // Additional quality indicators
  const confidenceRange = maxConfidence - minConfidence;
  const consistency = confidenceRange < 20 ? 'high' : confidenceRange < 40 ? 'medium' : 'low';
  
  const bestResult = validResults.find(r => r.confidence === maxConfidence);
  
  return {
    confidence: Math.round(avgConfidence),
    maxConfidence: Math.round(maxConfidence),
    minConfidence: Math.round(minConfidence),
    confidenceRange: Math.round(confidenceRange),
    consistency,
    quality,
    totalWords,
    processingTime,
    passesUsed: validResults.length,
    bestMethod: bestResult?.description || 'unknown',
    details: `${validResults.length} passes, ${consistency} consistency`
  };
}

/**
 * Cleanup image variants
 */
async function cleanupImageVariants(variants) {
  console.log('🧹 Cleaning up image variants...');
  
  for (const variant of variants) {
    try {
      if (fs.existsSync(variant.path)) {
        fs.unlinkSync(variant.path);
      }
    } catch (error) {
      console.warn(`⚠️ Could not delete: ${variant.path}`);
    }
  }
  
  // Clean up temp directory
  try {
    const tempDir = path.dirname(variants[0]?.path);
    if (tempDir && fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      if (files.length === 0) {
        fs.rmdirSync(tempDir);
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Basic OCR fallback
 */
async function basicOCRFallback(imagePath) {
  console.log('🔄 Using basic Tesseract fallback...');
  
  try {
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && m.progress % 0.25 === 0) {
          console.log(`Basic OCR: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    return {
      text: result.data.text,
      originalText: result.data.text,
      confidence: Math.round(result.data.confidence),
      wordCount: result.data.text.split(/\s+/).filter(w => w.length > 0).length,
      characterCount: result.data.text.length,
      qualityMetrics: {
        confidence: Math.round(result.data.confidence),
        quality: 'basic',
        processingTime: 0,
        details: 'Basic fallback OCR'
      },
      metadata: {
        imagePath,
        processedAt: new Date().toISOString(),
        ocrEngine: 'Basic Tesseract Fallback',
        fallback: true
      }
    };
  } catch (error) {
    throw new Error(`Complete OCR failure: ${error.message}`);
  }
}

/**
 * Default OCR configuration
 */
function getDefaultOCRConfig() {
  return {
    global_settings: {
      max_preprocessing_passes: 6,
      max_ocr_passes: 4,
      confidence_threshold: 30,
      enable_word_level_merging: true,
      temp_file_cleanup: true
    }
  };
}

// Export only the OCR function - no AI dependencies
module.exports = {
  extractTextFromImage
}; 