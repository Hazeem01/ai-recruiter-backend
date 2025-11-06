const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { storage, db, BUCKETS } = require('../utils/dbClient');
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
    logger.info('Uploading file to storage', { 
      bucketName, 
      filePath, 
      fileSize: file.size,
      mimeType: file.mimetype 
    });
    
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
      logger.error('File upload to storage failed', { 
        error: uploadResult.error,
        bucketName,
        filePath 
      });
      throw new Error(`Failed to upload file to storage: ${uploadResult.error}`);
    }
    
    logger.info('File uploaded to storage successfully', { 
      bucketName, 
      filePath,
      fileSize: file.size 
    });

    // Get public URL
    const urlResult = await storage.getFileUrl(bucketName, filePath);
    if (!urlResult.success) {
      logger.warn('Failed to get public URL, but continuing with upload', { 
        error: urlResult.error, 
        bucketName, 
        filePath 
      });
      // Continue without URL - we can still access the file via download
    }

    // Create file record in database
    const fileData = {
      id: fileId,
      user_id: userId,
      filename: file.originalname,
      file_path: filePath,
      file_url: urlResult.success ? urlResult.data : null,
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
    const dbDeleteResult = await db.deleteFileById(fileId);
    if (!dbDeleteResult.success) {
      logger.error('Failed to delete file record from database', { error: dbDeleteResult.error });
      throw new Error(`Failed to delete file record: ${dbDeleteResult.error}`);
    }

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

    // Get user files from database
    const filters = { category, page, limit };
    const result = await db.getUserFiles(userId, filters);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    // Transform the data to match the expected format
    const transformedFiles = result.data.files.map(file => ({
      id: file.id,
      filename: file.filename,
      fileUrl: file.file_url,
      fileSize: file.file_size,
      category: file.category,
      mimeType: file.mime_type,
      createdAt: file.created_at
    }));

    logger.info('User files retrieved successfully', { 
      userId, 
      count: result.data.files.length,
      totalFiles: result.data.pagination.totalFiles
    });

    res.status(200).json({
      success: true,
      data: {
        files: transformedFiles,
        pagination: result.data.pagination
      }
    });

  } catch (error) {
    logger.error('Error getting user files', { error: error.message });
    next(error);
  }
};

// Debug file status (development only)
exports.debugFileStatus = async (req, res, next) => {
  const userId = req.user?.id;
  const fileId = req.params.fileId;

  try {
    logger.info('Debug file status', { fileId, userId });

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

    // Check if file exists in storage
    const { storage: storageClient } = require('../utils/dbClient');
    const { data: fileList, error: listError } = await supabase.storage
      .from(fileResult.data.bucket_name)
      .list(fileResult.data.file_path.split('/').slice(0, -1).join('/'));

    // Try to download a small portion to test access
    const { data: testDownload, error: downloadError } = await supabase.storage
      .from(fileResult.data.bucket_name)
      .download(fileResult.data.file_path);

    const debugInfo = {
      fileRecord: {
        id: fileResult.data.id,
        filename: fileResult.data.filename,
        file_path: fileResult.data.file_path,
        file_url: fileResult.data.file_url,
        file_size: fileResult.data.file_size,
        bucket_name: fileResult.data.bucket_name,
        category: fileResult.data.category,
        created_at: fileResult.data.created_at
      },
      storageStatus: {
        bucketExists: !listError,
        fileExists: testDownload && testDownload.length > 0,
        downloadError: downloadError ? downloadError.message : null,
        listError: listError ? listError.message : null,
        testDownloadSize: testDownload ? testDownload.length : 0
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Not set',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set'
      }
    };

    logger.info('Debug file status completed', { fileId, debugInfo });

    res.status(200).json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    logger.error('Error debugging file status', { error: error.message });
    next(error);
  }
};

// Test upload function (development only)
exports.testUpload = async (req, res, next) => {
  const userId = req.user?.id;
  const { category = 'resumes' } = req.body;

  try {
    logger.info('Test upload attempt', { userId, category });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const file = req.file;
    const fileId = uuidv4();
    const filePath = `${userId}/${category}/${fileId}_${file.originalname}`;

    logger.info('Test upload details', { 
      fileId, 
      filePath, 
      fileSize: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname 
    });

    // Test storage upload step by step
    const { storage: storageClient } = require('../utils/dbClient');
    
    // Step 1: Test file upload
    const uploadResult = await storage.uploadFile(
      BUCKETS.RESUMES,
      filePath,
      file.buffer,
      {
        contentType: file.mimetype,
        upsert: false
      }
    );
    
    logger.info('Upload result', { 
      success: uploadResult.success, 
      error: uploadResult.error,
      data: uploadResult.data 
    });

    if (!uploadResult.success) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }

    // Step 2: Test file download
    const downloadResult = await storage.downloadFile(BUCKETS.RESUMES, filePath);
    
    logger.info('Download test result', { 
      success: downloadResult.success, 
      error: downloadResult.error,
      downloadSize: downloadResult.data?.length 
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Test upload completed successfully',
        fileId,
        filePath,
        uploadSuccess: !uploadError,
        downloadSuccess: !downloadError,
        fileSize: file.size,
        downloadSize: downloadData?.length || 0
      }
    });

  } catch (error) {
    logger.error('Test upload failed', { error: error.message });
    next(error);
  }
};

// Export multer upload for use in routes
exports.upload = upload; 