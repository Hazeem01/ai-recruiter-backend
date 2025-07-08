const { db } = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { ValidationError } = require('../middleware/errorHandler');

// Get dashboard statistics
exports.getDashboardStats = async (req, res, next) => {
  const recruiterId = req.user?.id;

  try {
    logger.info('Getting dashboard stats', { recruiterId });

    if (!recruiterId) {
      throw new ValidationError('User not authenticated');
    }

    // Get jobs count
    const jobsResult = await db.getJobs({ recruiter_id: recruiterId });
    const totalJobs = jobsResult.success ? jobsResult.data.length : 0;
    const activeJobs = jobsResult.success ? jobsResult.data.filter(job => job.status === 'active').length : 0;

    // Get candidates count
    const candidatesResult = await db.getCandidates({ recruiter_id: recruiterId });
    const totalCandidates = candidatesResult.success ? candidatesResult.data.length : 0;

    // Get interviews count
    const interviewsResult = await db.getInterviews({ recruiter_id: recruiterId });
    const totalInterviews = interviewsResult.success ? interviewsResult.data.length : 0;
    const upcomingInterviews = interviewsResult.success ? 
      interviewsResult.data.filter(interview => 
        new Date(interview.scheduled_at) > new Date() && interview.status === 'scheduled'
      ).length : 0;

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJobs = jobsResult.success ? 
      jobsResult.data.filter(job => new Date(job.created_at) > thirtyDaysAgo).length : 0;
    
    const recentCandidates = candidatesResult.success ? 
      candidatesResult.data.filter(candidate => new Date(candidate.applied_at) > thirtyDaysAgo).length : 0;

    const stats = {
      totalJobs,
      activeJobs,
      totalCandidates,
      totalInterviews,
      upcomingInterviews,
      recentJobs,
      recentCandidates,
      lastUpdated: new Date().toISOString()
    };

    logger.info('Dashboard stats retrieved successfully', { recruiterId, stats });

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting dashboard stats', { error: error.message });
    next(error);
  }
};

// Get jobs with filtering
exports.getJobs = async (req, res, next) => {
  const recruiterId = req.user?.id;
  const { status, search, page = 1, limit = 10 } = req.query;

  try {
    logger.info('Getting jobs', { recruiterId, filters: { status, search, page, limit } });

    if (!recruiterId) {
      throw new ValidationError('User not authenticated');
    }

    const filters = { recruiter_id: recruiterId };
    if (status) filters.status = status;
    if (search) filters.search = search;

    const result = await db.getJobs(filters);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedJobs = result.data.slice(startIndex, endIndex);

    const response = {
      jobs: paginatedJobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.data.length / limit),
        totalJobs: result.data.length,
        hasNextPage: endIndex < result.data.length,
        hasPrevPage: page > 1
      }
    };

    logger.info('Jobs retrieved successfully', { recruiterId, count: paginatedJobs.length });

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error getting jobs', { error: error.message });
    next(error);
  }
};

// Create new job posting
exports.createJob = async (req, res, next) => {
  const recruiterId = req.user?.id;
  const { title, description, requirements, location, salary_range, job_type, status = 'active', company } = req.body;

  try {
    logger.info('Creating job posting', { recruiterId, title });

    if (!recruiterId) {
      throw new ValidationError('User not authenticated');
    }

    if (!title || !description) {
      throw new ValidationError('Title and description are required');
    }

    const jobData = {
      recruiter_id: recruiterId,
      title,
      description,
      requirements: requirements || [],
      location,
      salary_range,
      job_type,
      status,
      company: company || 'Unknown Company',
      created_at: new Date().toISOString()
    };

    const result = await db.createJob(jobData);
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Job created successfully', { jobId: result.data.id, recruiterId });

    res.status(201).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Error creating job', { error: error.message });
    next(error);
  }
};

// Update job posting
exports.updateJob = async (req, res, next) => {
  const recruiterId = req.user?.id;
  const jobId = req.params.id;
  const updates = req.body;

  try {
    logger.info('Updating job posting', { jobId, recruiterId });

    if (!recruiterId) {
      throw new ValidationError('User not authenticated');
    }

    if (!jobId) {
      throw new ValidationError('Job ID is required');
    }

    // Verify job belongs to recruiter
    const existingJob = await db.getJobs({ recruiter_id: recruiterId });
    if (!existingJob.success || !existingJob.data.find(job => job.id === jobId)) {
      throw new ValidationError('Job not found or access denied');
    }

    // Map frontend field names to database column names
    const mappedUpdates = { ...updates };
    if (mappedUpdates.type !== undefined) {
      mappedUpdates.job_type = mappedUpdates.type;
      delete mappedUpdates.type;
    }
    if (mappedUpdates.salary !== undefined) {
      mappedUpdates.salary_range = mappedUpdates.salary;
      delete mappedUpdates.salary;
    }

    const result = await db.updateJob(jobId, mappedUpdates);
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Job updated successfully', { jobId, recruiterId });

    res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Error updating job', { error: error.message });
    next(error);
  }
};

// Delete job posting
exports.deleteJob = async (req, res, next) => {
  const recruiterId = req.user?.id;
  const jobId = req.params.id;

  try {
    logger.info('Deleting job posting', { jobId, recruiterId });

    if (!recruiterId) {
      throw new ValidationError('User not authenticated');
    }

    if (!jobId) {
      throw new ValidationError('Job ID is required');
    }

    // Verify job belongs to recruiter
    const existingJob = await db.getJobs({ recruiter_id: recruiterId });
    if (!existingJob.success || !existingJob.data.find(job => job.id === jobId)) {
      throw new ValidationError('Job not found or access denied');
    }

    const result = await db.deleteJob(jobId);
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Job deleted successfully', { jobId, recruiterId });

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting job', { error: error.message });
    next(error);
  }
};

// Get candidates with filtering
exports.getCandidates = async (req, res, next) => {
  const recruiterId = req.user?.id;
  const { status, jobId, page = 1, limit = 10 } = req.query;

  try {
    logger.info('Getting candidates', { recruiterId, filters: { status, jobId, page, limit } });

    if (!recruiterId) {
      throw new ValidationError('User not authenticated');
    }

    const filters = { recruiter_id: recruiterId };
    if (status) filters.status = status;
    if (jobId) filters.job_id = jobId;

    const result = await db.getCandidates(filters);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCandidates = result.data.slice(startIndex, endIndex);

    const response = {
      candidates: paginatedCandidates,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.data.length / limit),
        totalCandidates: result.data.length,
        hasNextPage: endIndex < result.data.length,
        hasPrevPage: page > 1
      }
    };

    logger.info('Candidates retrieved successfully', { recruiterId, count: paginatedCandidates.length });

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error getting candidates', { error: error.message });
    next(error);
  }
};

// Get candidate details
exports.getCandidateDetails = async (req, res, next) => {
  const recruiterId = req.user?.id;
  const candidateId = req.params.id;

  try {
    logger.info('Getting candidate details', { candidateId, recruiterId });

    if (!recruiterId) {
      throw new ValidationError('User not authenticated');
    }

    if (!candidateId) {
      throw new ValidationError('Candidate ID is required');
    }

    // Get candidate details
    const candidates = await db.getCandidates({ recruiter_id: recruiterId });
    if (!candidates.success) {
      throw new Error(candidates.error);
    }

    const candidate = candidates.data.find(c => c.id === candidateId);
    if (!candidate) {
      throw new ValidationError('Candidate not found or access denied');
    }

    // Get candidate's resume if available
    let resume = null;
    if (candidate.resume_id) {
      const resumeResult = await db.getResumeById(candidate.resume_id);
      if (resumeResult.success) {
        resume = resumeResult.data;
      }
    }

    // Get candidate's interviews
    const interviewsResult = await db.getInterviews({ candidate_id: candidateId });
    const interviews = interviewsResult.success ? interviewsResult.data : [];

    const candidateDetails = {
      ...candidate,
      resume,
      interviews
    };

    logger.info('Candidate details retrieved successfully', { candidateId, recruiterId });

    res.status(200).json({
      success: true,
      data: candidateDetails
    });

  } catch (error) {
    logger.error('Error getting candidate details', { error: error.message });
    next(error);
  }
}; 