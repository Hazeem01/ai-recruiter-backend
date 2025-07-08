const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
  sendMessage,
  getChatHistory,
  clearChatHistory,
  getChatSuggestions
} = require('../controllers/chatController');
const { 
  validateChatMessage, 
  handleValidationErrors 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting for chat routes
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many chat requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to chat routes
router.use(chatLimiter);

// Chat endpoints
router.post('/message', authenticateToken, validateChatMessage, handleValidationErrors, sendMessage);
router.get('/history', authenticateToken, getChatHistory);
router.delete('/history', authenticateToken, clearChatHistory);
router.get('/suggestions', getChatSuggestions);

module.exports = router; 