const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
  uploadResume,
  parseResume,
  analyzeJob,
  scheduleInterview,
  getInterviews,
  proSignup,
  applyForJob,
  getApplications,
  upload
} = require('../controllers/applicantController');
const { 
  validateResumeUpload, 
  validateJobAnalysis, 
  validateInterviewScheduling,
  validateJobApplication,
  validateApplicationRetrieval,
  handleValidationErrors 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting for applicant routes
const applicantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to applicant routes
router.use(applicantLimiter);

// Resume management
router.post('/resumes/upload', upload.single('resume'), uploadResume);
router.post('/resumes/parse', validateResumeUpload, handleValidationErrors, parseResume);

// Job analysis
router.post('/ai/analyze-job', validateJobAnalysis, handleValidationErrors, analyzeJob);

// AI content generation (reuse existing endpoints)
router.post('/ai/generate-resume', require('../controllers/aiController').generateResume);
router.post('/ai/generate-cover-letter', require('../controllers/aiController').generateCoverLetter);
router.post('/ai/generate-both', require('../controllers/aiController').generateBoth);

// PDF export (reuse existing endpoints)
router.post('/export/resume', require('../controllers/pdfController').exportResumePDF);
router.post('/export/cover-letter', require('../controllers/pdfController').exportCoverLetterPDF);

// Interview management
router.post('/interviews', authenticateToken, validateInterviewScheduling, handleValidationErrors, scheduleInterview);
router.get('/interviews', authenticateToken, getInterviews);

// Pro signup
router.post('/pro/signup', proSignup);

// Job applications
router.post('/applications', authenticateToken, validateJobApplication, handleValidationErrors, applyForJob);
router.get('/applications', authenticateToken, validateApplicationRetrieval, handleValidationErrors, getApplications);

module.exports = router; 