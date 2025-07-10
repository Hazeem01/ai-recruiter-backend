const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
  uploadFile,
  getFile,
  downloadFile,
  deleteFile,
  getUserFiles,
  upload,
  debugFileStatus
} = require('../controllers/fileController');
const { 
  validateFileUpload, 
  handleValidationErrors 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting for file routes
const fileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many file requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to file routes
router.use(fileLimiter);

// File management endpoints
router.post('/upload', authenticateToken, upload.single('file'), uploadFile);
router.get('/:id', authenticateToken, getFile);
router.get('/:id/download', authenticateToken, downloadFile);
router.delete('/:id', authenticateToken, deleteFile);
router.get('/user/files', authenticateToken, getUserFiles);

// Debug endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/debug/:fileId', authenticateToken, debugFileStatus);
  router.post('/test-upload', authenticateToken, upload.single('file'), require('../controllers/fileController').testUpload);
}

module.exports = router; 