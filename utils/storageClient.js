require('dotenv').config();
const AWS = require('aws-sdk');
const logger = require('./logger');

// DigitalOcean Spaces configuration (S3-compatible)
const spacesEndpoint = process.env.SPACES_ENDPOINT || 'https://lon1.digitaloceanspaces.com';
const spacesKey = process.env.SPACES_KEY;
const spacesSecret = process.env.SPACES_SECRET;
const spacesRegion = process.env.SPACES_REGION || 'lon1';
const defaultBucket = process.env.SPACES_BUCKET;

if (!spacesKey || !spacesSecret) {
  logger.warn('Spaces credentials not configured. File storage will not work.', {
    hasKey: !!spacesKey,
    hasSecret: !!spacesSecret
  });
}

// Configure AWS SDK for DigitalOcean Spaces
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: spacesKey,
  secretAccessKey: spacesSecret,
  region: spacesRegion,
  s3ForcePathStyle: false, // Use virtual-hosted style URLs
  signatureVersion: 'v4'
});

// Storage bucket names
const BUCKETS = {
  RESUMES: 'resumes',
  FILES: 'files',
  AVATARS: 'avatars'
};

// Storage operations
const storage = {
  /**
   * Upload a file to DigitalOcean Spaces
   * @param {string} bucketName - Name of the bucket
   * @param {string} filePath - Path/filename in the bucket
   * @param {Buffer} fileBuffer - File content as Buffer
   * @param {object} options - Upload options (contentType, acl, etc.)
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async uploadFile(bucketName, filePath, fileBuffer, options = {}) {
    try {
      if (!spacesKey || !spacesSecret) {
        throw new Error('Spaces credentials not configured');
      }

      const params = {
        Bucket: bucketName,
        Key: filePath,
        Body: fileBuffer,
        ContentType: options.contentType || 'application/octet-stream',
        ACL: options.acl || 'private' // Default to private, can be 'public-read' for public files
      };

      // If upsert is false and file exists, we might want to handle it differently
      // For now, we'll allow overwriting

      const result = await s3.upload(params).promise();
      
      logger.info('File uploaded successfully', {
        bucket: bucketName,
        key: filePath,
        location: result.Location
      });

      return {
        success: true,
        data: {
          Key: result.Key,
          Location: result.Location,
          ETag: result.ETag,
          Bucket: result.Bucket
        }
      };
    } catch (error) {
      logger.error('Error uploading file', {
        error: error.message,
        bucket: bucketName,
        filePath
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Get a public or signed URL for a file
   * @param {string} bucketName - Name of the bucket
   * @param {string} filePath - Path/filename in the bucket
   * @param {number} expiresIn - Expiration time in seconds for signed URLs (default: 1 hour)
   * @returns {Promise<{success: boolean, data?: string, error?: string}>}
   */
  async getFileUrl(bucketName, filePath, expiresIn = 3600) {
    try {
      if (!spacesKey || !spacesSecret) {
        throw new Error('Spaces credentials not configured');
      }

      // First, try to check if the file is public
      // For public files, we can construct the public URL directly
      const publicUrl = `https://${bucketName}.${spacesRegion}.digitaloceanspaces.com/${filePath}`;
      
      // Try to check if file exists and is accessible
      try {
        await s3.headObject({
          Bucket: bucketName,
          Key: filePath
        }).promise();

        // Check if the file might be public by trying to fetch it
        // For now, we'll generate a signed URL which works for both public and private files
        const signedUrl = s3.getSignedUrl('getObject', {
          Bucket: bucketName,
          Key: filePath,
          Expires: expiresIn
        });

        return { success: true, data: signedUrl };
      } catch (headError) {
        // File might not exist, return null
        logger.warn('File not found or not accessible', {
          bucket: bucketName,
          filePath,
          error: headError.message
        });
        return { success: true, data: null };
      }
    } catch (error) {
      logger.error('Error getting file URL', {
        error: error.message,
        bucket: bucketName,
        filePath
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Get a public URL (only works if file ACL is public-read)
   * @param {string} bucketName - Name of the bucket
   * @param {string} filePath - Path/filename in the bucket
   * @returns {string} Public URL
   */
  getPublicUrl(bucketName, filePath) {
    return `https://${bucketName}.${spacesRegion}.digitaloceanspaces.com/${filePath}`;
  },

  /**
   * Download a file from DigitalOcean Spaces
   * @param {string} bucketName - Name of the bucket
   * @param {string} filePath - Path/filename in the bucket
   * @returns {Promise<{success: boolean, data?: Buffer, error?: string}>}
   */
  async downloadFile(bucketName, filePath) {
    try {
      if (!spacesKey || !spacesSecret) {
        throw new Error('Spaces credentials not configured');
      }

      const params = {
        Bucket: bucketName,
        Key: filePath
      };

      const result = await s3.getObject(params).promise();
      
      return {
        success: true,
        data: result.Body,
        contentType: result.ContentType,
        contentLength: result.ContentLength
      };
    } catch (error) {
      logger.error('Error downloading file', {
        error: error.message,
        bucket: bucketName,
        filePath
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a file from DigitalOcean Spaces
   * @param {string} bucketName - Name of the bucket
   * @param {string} filePath - Path/filename in the bucket
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteFile(bucketName, filePath) {
    try {
      if (!spacesKey || !spacesSecret) {
        throw new Error('Spaces credentials not configured');
      }

      const params = {
        Bucket: bucketName,
        Key: filePath
      };

      await s3.deleteObject(params).promise();
      
      logger.info('File deleted successfully', {
        bucket: bucketName,
        filePath
      });

      return { success: true };
    } catch (error) {
      logger.error('Error deleting file', {
        error: error.message,
        bucket: bucketName,
        filePath
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * List files in a bucket (with optional prefix)
   * @param {string} bucketName - Name of the bucket
   * @param {string} prefix - Optional prefix to filter files
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async listFiles(bucketName, prefix = '') {
    try {
      if (!spacesKey || !spacesSecret) {
        throw new Error('Spaces credentials not configured');
      }

      const params = {
        Bucket: bucketName
      };

      if (prefix) {
        params.Prefix = prefix;
      }

      const result = await s3.listObjectsV2(params).promise();
      
      return {
        success: true,
        data: result.Contents || []
      };
    } catch (error) {
      logger.error('Error listing files', {
        error: error.message,
        bucket: bucketName,
        prefix
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if a file exists
   * @param {string} bucketName - Name of the bucket
   * @param {string} filePath - Path/filename in the bucket
   * @returns {Promise<{success: boolean, exists?: boolean, error?: string}>}
   */
  async fileExists(bucketName, filePath) {
    try {
      if (!spacesKey || !spacesSecret) {
        throw new Error('Spaces credentials not configured');
      }

      await s3.headObject({
        Bucket: bucketName,
        Key: filePath
      }).promise();

      return { success: true, exists: true };
    } catch (error) {
      if (error.code === 'NotFound') {
        return { success: true, exists: false };
      }
      logger.error('Error checking file existence', {
        error: error.message,
        bucket: bucketName,
        filePath
      });
      return { success: false, error: error.message };
    }
  }
};

module.exports = {
  storage,
  BUCKETS,
  s3
};

