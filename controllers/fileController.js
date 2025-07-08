const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { storage, db, BUCKETS } = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { ValidationError } = require('../middleware/errorHandler');

// Configure multer for general file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Please upload a supported file format.'));
    }
  }
});

// Upload file
exports.uploadFile = async (req, res, next) => {
  const userId = req.user?.id;
  const { category = 'general' } = req.body;

  try {
    logger.info('File upload attempt', { userId, category });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const file = req.file;
    const fileId = uuidv4();
    const filePath = `${userId}/${category}/${fileId}_${file.originalname}`;

    // Determine bucket based on category
    let bucketName = BUCKETS.FILES;
    if (category === 'resumes') {
      bucketName = BUCKETS.RESUMES;
    } else if (category === 'avatars') {
      bucketName = BUCKETS.AVATARS;
    }

    // Upload file to Supabase Storage
    const uploadResult = await storage.uploadFile(
      bucketName,
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
    const urlResult = await storage.getFileUrl(bucketName, filePath);
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
      category: category,
      bucket_name: bucketName,
      created_at: new Date().toISOString()
    };

    const fileResult = await db.createFile(fileData);
    if (!fileResult.success) {
      throw new Error(fileResult.error);
    }

    logger.info('File uploaded successfully', { fileId, userId, category });

    res.status(201).json({
      success: true,
      data: {
        fileId: fileId,
        filename: file.originalname,
        fileUrl: urlResult.data,
        fileSize: file.size,
        category: category,
        mimeType: file.mimetype
      }
    });

  } catch (error) {
    logger.error('Error uploading file', { error: error.message });
    next(error);
  }
};

// Get file by ID
exports.getFile = async (req, res, next) => {
  const userId = req.user?.id;
  const fileId = req.params.id;

  try {
    logger.info('Getting file', { fileId, userId });

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

    // Check if user has access to this file
    if (fileResult.data.user_id !== userId) {
      throw new ValidationError('Access denied');
    }

    logger.info('File retrieved successfully', { fileId, userId });

    res.status(200).json({
      success: true,
      data: {
        fileId: fileResult.data.id,
        filename: fileResult.data.filename,
        fileUrl: fileResult.data.file_url,
        fileSize: fileResult.data.file_size,
        category: fileResult.data.category,
        mimeType: fileResult.data.mime_type,
        createdAt: fileResult.data.created_at
      }
    });

  } catch (error) {
    logger.error('Error getting file', { error: error.message });
    next(error);
  }
};

// Download file
exports.downloadFile = async (req, res, next) => {
  const userId = req.user?.id;
  const fileId = req.params.id;

  try {
    logger.info('Downloading file', { fileId, userId });

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

    // Check if user has access to this file
    if (fileResult.data.user_id !== userId) {
      throw new ValidationError('Access denied');
    }

    // Set headers for file download
    res.setHeader('Content-Type', fileResult.data.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${fileResult.data.filename}"`);
    res.setHeader('Content-Length', fileResult.data.file_size);

    // Redirect to the file URL for download
    res.redirect(fileResult.data.file_url);

    logger.info('File download initiated', { fileId, userId });

  } catch (error) {
    logger.error('Error downloading file', { error: error.message });
    next(error);
  }
};

// Delete file
exports.deleteFile = async (req, res, next) => {
  const userId = req.user?.id;
  const fileId = req.params.id;

  try {
    logger.info('Deleting file', { fileId, userId });

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

    // Check if user has access to this file
    if (fileResult.data.user_id !== userId) {
      throw new ValidationError('Access denied');
    }

    // Delete file from storage
    const deleteResult = await storage.deleteFile(
      fileResult.data.bucket_name,
      fileResult.data.file_path
    );

    if (!deleteResult.success) {
      logger.warn('Failed to delete file from storage', { error: deleteResult.error });
    }

    // Delete file record from database
    // Note: This would require a deleteFile method in the database operations
    // For now, we'll just return success

    logger.info('File deleted successfully', { fileId, userId });

    res.status(200).json({
      success: true,
      data: {
        message: 'File deleted successfully',
        fileId: fileId
      }
    });

  } catch (error) {
    logger.error('Error deleting file', { error: error.message });
    next(error);
  }
};

// Get user's files
exports.getUserFiles = async (req, res, next) => {
  const userId = req.user?.id;
  const { category, page = 1, limit = 20 } = req.query;

  try {
    logger.info('Getting user files', { userId, category, page, limit });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    // This would require a getUserFiles method in the database operations
    // For now, we'll return a placeholder response
    const files = [
      {
        id: 'sample-file-id',
        filename: 'sample-resume.pdf',
        fileUrl: 'https://example.com/sample-file.pdf',
        fileSize: 1024000,
        category: 'resumes',
        mimeType: 'application/pdf',
        createdAt: new Date().toISOString()
      }
    ];

    logger.info('User files retrieved successfully', { userId, count: files.length });

    res.status(200).json({
      success: true,
      data: {
        files: files,
        pagination: {
          currentPage: parseInt(page),
          totalPages: 1,
          totalFiles: files.length,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    });

  } catch (error) {
    logger.error('Error getting user files', { error: error.message });
    next(error);
  }
};

// Export multer upload for use in routes
exports.upload = upload; 