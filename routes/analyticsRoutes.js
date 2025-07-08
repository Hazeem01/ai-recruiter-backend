const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many analytics requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all analytics routes
router.use(analyticsLimiter);

// Get API analytics (admin only)
router.get('/api', 
  authenticateToken,
  validateRequest({
    query: {
      startDate: { optional: true, isISO8601: true },
      endDate: { optional: true, isISO8601: true },
      groupBy: { optional: true, isIn: { options: ['hour', 'day', 'week', 'month'] } }
    }
  }),
  analyticsController.getApiAnalytics
);

// Get rate limiting statistics (admin only)
router.get('/rate-limits', 
  authenticateToken,
  analyticsController.getRateLimitStats
);

// Get system health status
router.get('/health', analyticsController.getSystemHealth);

module.exports = router; 