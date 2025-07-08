const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');
const { db, storage, BUCKETS } = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { ValidationError } = require('../middleware/errorHandler');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Upload resume file
exports.uploadResume = async (req, res, next) => {
  const userId = req.user?.id;

  try {
    logger.info('Resume upload attempt', { userId });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const file = req.file;
    const fileId = uuidv4();
    const filePath = `${userId}/${fileId}_${file.originalname}`;

    // Upload file to Supabase Storage
    const uploadResult = await storage.uploadFile(
      BUCKETS.RESUMES,
      filePath,
      file.buffer,
      {
        contentType: file.mimetype,
        upsert: false
      }
    );

    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    // Get public URL
    const urlResult = await storage.getFileUrl(BUCKETS.RESUMES, filePath);
    if (!urlResult.success) {
      throw new Error(urlResult.error);
    }

    // Create file record in database
    const fileData = {
      id: fileId,
      user_id: userId,
      filename: file.originalname,
      file_path: filePath,
      file_url: urlResult.data,
      file_size: file.size,
      mime_type: file.mimetype,
      created_at: new Date().toISOString()
    };

    const fileResult = await db.createFile(fileData);
    if (!fileResult.success) {
      throw new Error(fileResult.error);
    }

    logger.info('Resume uploaded successfully', { fileId, userId });

    res.status(201).json({
      success: true,
      data: {
        fileId: fileId,
        filename: file.originalname,
        fileUrl: urlResult.data,
        fileSize: file.size
      }
    });

  } catch (error) {
    logger.error('Error uploading resume', { error: error.message });
    next(error);
  }
};

// Parse resume text (extract content from uploaded file)
exports.parseResume = async (req, res, next) => {
  const userId = req.user?.id;
  const { fileId } = req.body;

  try {
    logger.info('Resume parsing attempt', { userId, fileId });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    if (!fileId) {
      throw new ValidationError('File ID is required');
    }

    // Get file record
    const fileResult = await db.getFileById(fileId);
    if (!fileResult.success || !fileResult.data) {
      throw new ValidationError('File not found');
    }

    if (fileResult.data.user_id !== userId) {
      throw new ValidationError('Access denied');
    }

    // For now, return a placeholder parsed content
    // In a real implementation, you would use OCR or text extraction libraries
    const parsedContent = {
      extractedText: "Sample extracted text from resume...",
      sections: {
        contact: {
          name: "John Doe",
          email: "john.doe@email.com",
          phone: "+1-555-0123"
        },
        experience: [
          {
            title: "Software Engineer",
            company: "Tech Corp",
            duration: "2020-2023",
            description: "Developed web applications using React and Node.js"
          }
        ],
        education: [
          {
            degree: "Bachelor of Science",
            institution: "University of Technology",
            year: "2020"
          }
        ],
        skills: ["JavaScript", "React", "Node.js", "Python"]
      }
    };

    // Create resume record
    const resumeData = {
      user_id: userId,
      file_id: fileId,
      parsed_content: parsedContent,
      created_at: new Date().toISOString()
    };

    const resumeResult = await db.createResume(resumeData);
    if (!resumeResult.success) {
      throw new Error(resumeResult.error);
    }

    logger.info('Resume parsed successfully', { resumeId: resumeResult.data.id, userId });

    res.status(200).json({
      success: true,
      data: {
        resumeId: resumeResult.data.id,
        parsedContent: parsedContent
      }
    });

  } catch (error) {
    logger.error('Error parsing resume', { error: error.message });
    next(error);
  }
};

// Analyze job posting from URL or text
exports.analyzeJob = async (req, res, next) => {
  const { jobUrl, jobText } = req.body;

  try {
    logger.info('Job analysis attempt', { hasUrl: !!jobUrl, hasText: !!jobText });

    if (!jobUrl && !jobText) {
      throw new ValidationError('Either job URL or job text is required');
    }

    let jobContent = jobText;

    // If URL provided, scrape the content
    if (jobUrl) {
      const scrapeJobWithPlaywright = require('../utils/scrapeJobWithPlaywright');
      try {
        jobContent = await scrapeJobWithPlaywright(jobUrl);
      } catch (playwrightError) {
        logger.warn('Playwright scraping failed, falling back to cheerio', { error: playwrightError.message });
        // Fallback to old method
        try {
          const response = await axios.get(jobUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          const $ = cheerio.load(response.data);
          $('script').remove();
          $('style').remove();
          jobContent = $('body').text().replace(/\s+/g, ' ').trim();
          if (jobContent.length > 10000) {
            jobContent = jobContent.substring(0, 10000);
          }
        } catch (error) {
          logger.warn('Failed to scrape job URL with fallback', { error: error.message });
          throw new ValidationError('Failed to extract content from the provided URL');
        }
      }
    }

    // Analyze job content using AI provider
    const aiProvider = require('../utils/aiProvider');
    const result = await aiProvider.analyzeJob(jobContent);
    if (!result.success) {
      throw new Error(result.error);
    }
    const analysis = result.data.content;
    logger.info('Job analysis completed successfully');
    res.status(200).json({
      success: true,
      data: {
        analysis: analysis,
        originalContent: jobContent.substring(0, 500) + '...'
      }
    });
  } catch (error) {
    logger.error('Error analyzing job', { error: error.message });
    next(error);
  }
};

// Schedule interview
exports.scheduleInterview = async (req, res, next) => {
  const recruiterId = req.user?.id;
  const { candidateId, jobId, scheduledAt, duration, type, notes } = req.body;

  try {
    logger.info('Interview scheduling attempt', { recruiterId, candidateId, jobId });

    if (!recruiterId) {
      throw new ValidationError('User not authenticated');
    }

    if (!candidateId || !jobId || !scheduledAt) {
      throw new ValidationError('Candidate ID, Job ID, and scheduled time are required');
    }

    // Verify recruiter owns the job
    const jobsResult = await db.getJobs({ recruiter_id: recruiterId });
    if (!jobsResult.success || !jobsResult.data.find(job => job.id === jobId)) {
      throw new ValidationError('Job not found or access denied');
    }

    // Verify candidate exists
    const candidatesResult = await db.getCandidates({ recruiter_id: recruiterId });
    if (!candidatesResult.success || !candidatesResult.data.find(candidate => candidate.id === candidateId)) {
      throw new ValidationError('Candidate not found or access denied');
    }

    const interviewData = {
      recruiter_id: recruiterId,
      candidate_id: candidateId,
      job_id: jobId,
      scheduled_at: scheduledAt,
      duration: duration || 60,
      type: type || 'video',
      notes: notes || '',
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    const result = await db.createInterview(interviewData);
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Interview scheduled successfully', { interviewId: result.data.id, recruiterId });

    res.status(201).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Error scheduling interview', { error: error.message });
    next(error);
  }
};

// Get interviews
exports.getInterviews = async (req, res, next) => {
  const userId = req.user?.id;
  const { status, page = 1, limit = 10 } = req.query;

  try {
    logger.info('Getting interviews', { userId, filters: { status, page, limit } });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const filters = {};
    if (status) filters.status = status;

    // For recruiters, filter by recruiter_id
    // For applicants, filter by candidate_id
    const userResult = await db.getUserById(userId);
    if (!userResult.success) {
      throw new Error('User not found');
    }

    if (userResult.data.role === 'recruiter') {
      filters.recruiter_id = userId;
    } else {
      filters.candidate_id = userId;
    }

    const result = await db.getInterviews(filters);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedInterviews = result.data.slice(startIndex, endIndex);

    const response = {
      interviews: paginatedInterviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.data.length / limit),
        totalInterviews: result.data.length,
        hasNextPage: endIndex < result.data.length,
        hasPrevPage: page > 1
      }
    };

    logger.info('Interviews retrieved successfully', { userId, count: paginatedInterviews.length });

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error getting interviews', { error: error.message });
    next(error);
  }
};

// Pro signup
exports.proSignup = async (req, res, next) => {
  const { email, firstName, lastName, company, role } = req.body;

  try {
    logger.info('Pro signup attempt', { email, role });

    if (!email || !firstName || !lastName) {
      throw new ValidationError('Email, first name, and last name are required');
    }

    const signupData = {
      email,
      first_name: firstName,
      last_name: lastName,
      company: company || '',
      role: role || 'applicant',
      created_at: new Date().toISOString()
    };

    const result = await db.createProSignup(signupData);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Here you would typically send a welcome email
    // For now, just log the signup
    logger.info('Pro signup completed', { email, signupId: result.data.id });

    res.status(201).json({
      success: true,
      data: {
        message: 'Pro signup successful. We will contact you soon!',
        signupId: result.data.id
      }
    });

  } catch (error) {
    logger.error('Error in pro signup', { error: error.message });
    next(error);
  }
};

// Apply for a job
exports.applyForJob = async (req, res, next) => {
  const userId = req.user?.id;
  const { jobId, resumeUrl, coverLetterUrl } = req.body;

  try {
    logger.info('Job application attempt', { userId, jobId });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    if (!jobId) {
      throw new ValidationError('Job ID is required');
    }

    // Verify the job exists and is active
    const jobResult = await db.getJobs({ id: jobId });
    if (!jobResult.success || !jobResult.data.length) {
      throw new ValidationError('Job not found');
    }

    const job = jobResult.data[0];
    if (job.status !== 'active') {
      throw new ValidationError('This job is not currently accepting applications');
    }

    // Check if user has already applied for this job
    const existingApplication = await db.getCandidates({ 
      user_id: userId, 
      job_id: jobId 
    });
    
    if (existingApplication.success && existingApplication.data.length > 0) {
      throw new ValidationError('You have already applied for this job');
    }

    // Create the application
    const applicationData = {
      user_id: userId,
      job_id: jobId,
      status: 'applied',
      resume_url: resumeUrl || null,
      cover_letter_url: coverLetterUrl || null,
      applied_at: new Date().toISOString()
    };

    const result = await db.createCandidate(applicationData);
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Job application submitted successfully', { 
      applicationId: result.data.id, 
      userId, 
      jobId 
    });

    res.status(201).json({
      success: true,
      data: {
        applicationId: result.data.id,
        status: 'applied',
        appliedAt: result.data.applied_at,
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location
        }
      }
    });

  } catch (error) {
    logger.error('Error applying for job', { error: error.message });
    next(error);
  }
};

// Get user's job applications
exports.getApplications = async (req, res, next) => {
  const userId = req.user?.id;
  const { status, page = 1, limit = 10 } = req.query;

  try {
    logger.info('Getting applications', { userId, filters: { status, page, limit } });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const filters = { user_id: userId };
    if (status) filters.status = status;

    // Get applications with job details
    const result = await db.getCandidates(filters);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedApplications = result.data.slice(startIndex, endIndex);

    // Transform the data to include job details
    const applications = paginatedApplications.map(app => ({
      id: app.id,
      status: app.status,
      appliedAt: app.applied_at,
      updatedAt: app.updated_at,
      resumeUrl: app.resume_url,
      coverLetterUrl: app.cover_letter_url,
      job: {
        id: app.job?.id,
        title: app.job?.title,
        company: app.job?.company,
        location: app.job?.location,
        jobType: app.job?.job_type,
        salaryRange: app.job?.salary_range,
        status: app.job?.status
      }
    }));

    const response = {
      applications: applications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.data.length / limit),
        totalApplications: result.data.length,
        hasNextPage: endIndex < result.data.length,
        hasPrevPage: page > 1
      }
    };

    logger.info('Applications retrieved successfully', { 
      userId, 
      count: applications.length 
    });

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error getting applications', { error: error.message });
    next(error);
  }
};

// Export multer upload for use in routes
exports.upload = upload; 