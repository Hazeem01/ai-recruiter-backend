const aiProvider = require("../utils/aiProvider");
const logger = require("../utils/logger");
const axios = require("axios");
const cheerio = require("cheerio");

// Helper function to extract job content from URL
async function extractJobFromUrl(jobUrl) {
  try {
    logger.info('Extracting job content from URL', { jobUrl });
    
    const response = await axios.get(jobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Extract text content
    let jobContent = $('body').text();
    
    // Clean up the content
    jobContent = jobContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    // Try to find job-specific content
    const jobSelectors = [
      '[class*="job"]',
      '[class*="position"]',
      '[class*="description"]',
      '[id*="job"]',
      '[id*="position"]',
      '[id*="description"]',
      'main',
      'article',
      '.content',
      '#content'
    ];
    
    for (const selector of jobSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const elementText = element.text().trim();
        if (elementText.length > 200) { // Minimum content threshold
          jobContent = elementText;
          break;
        }
      }
    }
    
    logger.info('Job content extracted successfully', { 
      contentLength: jobContent.length,
      url: jobUrl 
    });
    
    return {
      success: true,
      data: jobContent
    };
    
  } catch (error) {
    logger.error('Error extracting job from URL', { 
      error: error.message, 
      url: jobUrl 
    });
    
    return {
      success: false,
      error: `Failed to extract job content from URL: ${error.message}`
    };
  }
}

// Enhanced resume generation with job URL support
exports.generateResume = async (req, res, next) => {
  const { resume, resumeContent, jobDescription, jobUrl, preferences = {} } = req.body;
  
  // Handle both field names for backward compatibility
  const resumeData = resume || resumeContent;
  
  try {
    logger.info('Generating tailored resume', {
      resumeLength: resumeData?.length || 0,
      hasJobDescription: !!jobDescription,
      hasJobUrl: !!jobUrl,
      preferences,
      provider: aiProvider.getProvider()
    });

    // Validate inputs
    if (!resumeData) {
      throw new Error('Resume content is required');
    }

    let finalJobDescription = jobDescription;

    // If job URL provided, extract job content
    if (jobUrl && !jobDescription) {
      const jobExtraction = await extractJobFromUrl(jobUrl);
      if (!jobExtraction.success) {
        throw new Error(jobExtraction.error);
      }
      finalJobDescription = jobExtraction.data;
    } else if (!jobDescription && !jobUrl) {
      throw new Error('Either job description or job URL is required');
    }

    const result = await aiProvider.generateResume(resumeData, finalJobDescription, preferences);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Resume generated successfully', {
      generatedLength: result.data.content.length,
      provider: aiProvider.getProvider(),
      usedJobUrl: !!jobUrl
    });

    res.status(200).json({
      success: true,
      data: {
        resume: result.data.content,
        type: 'resume',
        provider: aiProvider.getProvider(),
        jobSource: jobUrl ? 'url' : 'description'
      }
    });

  } catch (error) {
    logger.error('Error generating resume', {
      error: error.message,
      stack: error.stack,
      provider: aiProvider.getProvider()
    });

    next(error);
  }
};

// Enhanced cover letter generation with job URL support
exports.generateCoverLetter = async (req, res, next) => {
  const { resume, resumeContent, jobDescription, jobUrl, preferences = {} } = req.body;
  
  // Handle both field names for backward compatibility
  const resumeData = resume || resumeContent;
  
  try {
    logger.info('Generating cover letter', {
      resumeLength: resumeData?.length || 0,
      hasJobDescription: !!jobDescription,
      hasJobUrl: !!jobUrl,
      preferences,
      provider: aiProvider.getProvider()
    });

    // Validate inputs
    if (!resumeData) {
      throw new Error('Resume content is required');
    }

    let finalJobDescription = jobDescription;

    // If job URL provided, extract job content
    if (jobUrl && !jobDescription) {
      const jobExtraction = await extractJobFromUrl(jobUrl);
      if (!jobExtraction.success) {
        throw new Error(jobExtraction.error);
      }
      finalJobDescription = jobExtraction.data;
    } else if (!jobDescription && !jobUrl) {
      throw new Error('Either job description or job URL is required');
    }

    const result = await aiProvider.generateCoverLetter(resumeData, finalJobDescription, preferences);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Cover letter generated successfully', {
      generatedLength: result.data.content.length,
      provider: aiProvider.getProvider(),
      usedJobUrl: !!jobUrl
    });

    res.status(200).json({
      success: true,
      data: {
        coverLetter: result.data.content,
        type: 'cover-letter',
        provider: aiProvider.getProvider(),
        jobSource: jobUrl ? 'url' : 'description'
      }
    });

  } catch (error) {
    logger.error('Error generating cover letter', {
      error: error.message,
      stack: error.stack,
      provider: aiProvider.getProvider()
    });

    next(error);
  }
};

// Enhanced both generation with job URL support
exports.generateBoth = async (req, res, next) => {
  const { resume, resumeContent, jobDescription, jobUrl, preferences = {} } = req.body;
  
  // Handle both field names for backward compatibility
  const resumeData = resume || resumeContent;
  
  try {
    logger.info('Generating both resume and cover letter', {
      resumeLength: resumeData?.length || 0,
      hasJobDescription: !!jobDescription,
      hasJobUrl: !!jobUrl,
      preferences,
      provider: aiProvider.getProvider()
    });

    // Validate inputs
    if (!resumeData) {
      throw new Error('Resume content is required');
    }

    let finalJobDescription = jobDescription;

    // If job URL provided, extract job content
    if (jobUrl && !jobDescription) {
      const jobExtraction = await extractJobFromUrl(jobUrl);
      if (!jobExtraction.success) {
        throw new Error(jobExtraction.error);
      }
      finalJobDescription = jobExtraction.data;
    } else if (!jobDescription && !jobUrl) {
      throw new Error('Either job description or job URL is required');
    }

    // Generate both documents using the AI provider
    const resumeResult = await aiProvider.generateResume(resumeData, finalJobDescription, preferences);
    const coverLetterResult = await aiProvider.generateCoverLetter(resumeData, finalJobDescription, preferences);
    
    if (!resumeResult.success) {
      throw new Error(resumeResult.error);
    }
    
    if (!coverLetterResult.success) {
      throw new Error(coverLetterResult.error);
    }

    logger.info('Both resume and cover letter generated successfully', {
      resumeLength: resumeResult.data.content.length,
      coverLetterLength: coverLetterResult.data.content.length,
      provider: aiProvider.getProvider(),
      usedJobUrl: !!jobUrl
    });

    res.status(200).json({
      success: true,
      data: {
        resume: resumeResult.data.content,
        coverLetter: coverLetterResult.data.content,
        type: 'both',
        provider: aiProvider.getProvider(),
        jobSource: jobUrl ? 'url' : 'description'
      }
    });

  } catch (error) {
    logger.error('Error generating both documents', {
      error: error.message,
      stack: error.stack,
      provider: aiProvider.getProvider()
    });

    next(error);
  }
};

// Legacy endpoint for backward compatibility
exports.generateContent = async (req, res, next) => {
  const { resume, jobDescription, jobUrl, preferences = {} } = req.body;
  
  try {
    logger.info('Legacy generateContent called', {
      resumeLength: resume?.length || 0,
      hasJobDescription: !!jobDescription,
      hasJobUrl: !!jobUrl
    });

    // Use the new generateBoth function
    return await exports.generateBoth(req, res, next);

  } catch (error) {
    logger.error('Error in legacy generateContent', {
      error: error.message,
      stack: error.stack
    });

    next(error);
  }
};