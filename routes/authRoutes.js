const express = require('express');
const router = express.Router();
// const rateLimit = require('express-rate-limit');
const { 
  register, 
  login, 
  logout, 
  getCurrentUser, 
  updateProfile 
} = require('../controllers/authController');
const { 
  validateAuthRegistration, 
  validateAuthLogin, 
  handleValidationErrors 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting for auth routes
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs (increased for development)
//   message: {
//     success: false,
//     error: {
//       message: 'Too many authentication attempts, please try again later.'
//     }
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Apply rate limiting to auth routes (disabled for development)
// router.use(authLimiter);

// Authentication endpoints
router.post('/register', validateAuthRegistration, handleValidationErrors, register);
router.post('/login', validateAuthLogin, handleValidationErrors, login);
router.post('/logout', logout);
router.get('/me', authenticateToken, getCurrentUser);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router; 