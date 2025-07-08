const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
  getDashboardStats,
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  getCandidates,
  getCandidateDetails
} = require('../controllers/dashboardController');
const { 
  validateJobCreation, 
  validateJobUpdate, 
  handleValidationErrors 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting for dashboard routes
const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to dashboard routes
router.use(dashboardLimiter);

// Dashboard endpoints
router.get('/stats', authenticateToken, getDashboardStats);

// Job management
router.get('/jobs', authenticateToken, getJobs);
router.post('/jobs', authenticateToken, validateJobCreation, handleValidationErrors, createJob);
router.put('/jobs/:id', authenticateToken, validateJobUpdate, handleValidationErrors, updateJob);
router.delete('/jobs/:id', authenticateToken, deleteJob);

// Candidate management
router.get('/candidates', authenticateToken, getCandidates);
router.get('/candidates/:id', authenticateToken, getCandidateDetails);

module.exports = router; 