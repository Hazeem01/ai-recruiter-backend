const { body, query, param, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

// Validation rules for resume generation
const validateResumeGeneration = [
  body('resume')
    .trim()
    .notEmpty()
    .withMessage('Resume content is required')
    .isLength({ min: 50, max: 10000 })
    .withMessage('Resume must be between 50 and 10,000 characters'),
  
  body('jobDescription')
    .optional()
    .trim()
    .isLength({ min: 50, max: 10000 })
    .withMessage('Job description must be between 50 and 10,000 characters'),
  
  body('jobUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Job URL must be a valid URL'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.tone')
    .optional()
    .isIn(['professional', 'friendly', 'confident', 'enthusiastic'])
    .withMessage('Tone must be one of: professional, friendly, confident, enthusiastic'),
  
  body('preferences.focus')
    .optional()
    .isArray()
    .withMessage('Focus must be an array'),
  
  body('preferences.focus.*')
    .optional()
    .isString()
    .withMessage('Focus items must be strings'),
];

// Validation rules for PDF export
const validatePdfExport = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required for PDF generation'),
  
  body('type')
    .optional()
    .isIn(['resume', 'cover-letter', 'both'])
    .withMessage('Type must be one of: resume, cover-letter, both'),
  
  body('format')
    .optional()
    .isIn(['A4', 'letter'])
    .withMessage('Format must be one of: A4, letter'),
];

// Authentication validation
const validateAuthRegistration = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('role')
    .optional()
    .isIn(['recruiter', 'applicant'])
    .withMessage('Role must be either recruiter or applicant'),
  
  body('company')
    .optional()
    .isObject()
    .withMessage('Company must be an object'),
  
  body('company.name')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  
  body('company.description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Company description must be less than 1000 characters'),
  
  body('company.website')
    .optional()
    .isURL()
    .withMessage('Invalid company website URL'),
  
  body('company.industry')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Company industry must be less than 100 characters'),
  
  body('company.size')
    .optional()
    .isIn(['startup', 'small', 'medium', 'large', 'enterprise'])
    .withMessage('Company size must be one of: startup, small, medium, large, enterprise'),
  
  body('company.location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Company location must be less than 255 characters'),
  
  body('company.foundedYear')
    .optional()
    .isInt({ min: 1800, max: 2025 })
    .withMessage('Company founded year must be between 1800 and 2025'),
];

const validateAuthLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),
];

// Job management validation
const validateJobCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Job title must be between 5 and 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 50, max: 5000 })
    .withMessage('Job description must be between 50 and 5,000 characters'),
  
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  
  body('requirements.*')
    .optional()
    .isString()
    .withMessage('Requirements must be strings'),
  
  body('company')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Company name must be less than 255 characters'),
  
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  
  body('salary_range')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Salary range must be less than 100 characters'),
  
  body('job_type')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship'])
    .withMessage('Job type must be one of: full-time, part-time, contract, internship'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Status must be one of: active, inactive, draft'),
];

const validateJobUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Job title must be between 5 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Job description must be between 50 and 5,000 characters'),
  
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  
  body('company')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Company name must be less than 255 characters'),
  
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  
  body('salary_range')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Salary range must be less than 100 characters'),
  
  body('job_type')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship'])
    .withMessage('Job type must be one of: full-time, part-time, contract, internship'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Status must be one of: active, inactive, draft'),
];

// Resume upload validation
const validateResumeUpload = [
  body('fileId')
    .trim()
    .notEmpty()
    .withMessage('File ID is required')
    .isUUID()
    .withMessage('Invalid file ID format'),
];

// Job analysis validation
const validateJobAnalysis = [
  body('jobUrl')
    .optional()
    .isURL()
    .withMessage('Invalid job URL format'),
  
  body('jobText')
    .optional()
    .trim()
    .isLength({ min: 50, max: 10000 })
    .withMessage('Job text must be between 50 and 10,000 characters'),
];

// Interview scheduling validation
const validateInterviewScheduling = [
  body('candidateId')
    .trim()
    .notEmpty()
    .withMessage('Candidate ID is required')
    .isUUID()
    .withMessage('Invalid candidate ID format'),
  
  body('jobId')
    .trim()
    .notEmpty()
    .withMessage('Job ID is required')
    .isUUID()
    .withMessage('Invalid job ID format'),
  
  body('scheduledAt')
    .trim()
    .notEmpty()
    .withMessage('Scheduled time is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  
  body('type')
    .optional()
    .isIn(['video', 'phone', 'onsite'])
    .withMessage('Interview type must be one of: video, phone, onsite'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1,000 characters'),
];

// Chat validation
const validateChatMessage = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2,000 characters'),
  
  body('context')
    .optional()
    .isIn(['general', 'resume', 'interview', 'job_search', 'recruiter'])
    .withMessage('Context must be one of: general, resume, interview, job_search, recruiter'),
];

// File upload validation
const validateFileUpload = [
  body('category')
    .optional()
    .isIn(['general', 'resumes', 'avatars', 'documents'])
    .withMessage('Category must be one of: general, resumes, avatars, documents'),
];

// Job application validation
const validateJobApplication = [
  body('jobId')
    .trim()
    .notEmpty()
    .withMessage('Job ID is required')
    .isUUID()
    .withMessage('Job ID must be a valid UUID'),
  
  body('resumeUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Resume URL must be a valid URL'),
  
  body('coverLetterUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Cover letter URL must be a valid URL'),
];

// Application retrieval validation
const validateApplicationRetrieval = [
  query('status')
    .optional()
    .isIn(['applied', 'reviewing', 'interviewing', 'offered', 'rejected'])
    .withMessage('Status must be one of: applied, reviewing, interviewing, offered, rejected'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// Dynamic validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const validations = [];
    
    // Handle body validation
    if (schema.body) {
      Object.keys(schema.body).forEach(field => {
        const rules = schema.body[field];
        let validation = body(field);
        
        if (rules.optional) {
          validation = validation.optional();
        } else {
          validation = validation.notEmpty().withMessage(`${field} is required`);
        }
        
        if (rules.isEmail) {
          validation = validation.isEmail().withMessage(`Invalid ${field} format`);
        }
        
        if (rules.isLength) {
          validation = validation.isLength(rules.isLength).withMessage(`${field} must be between ${rules.isLength.min} and ${rules.isLength.max} characters`);
        }
        
        if (rules.isIn) {
          validation = validation.isIn(rules.isIn.options).withMessage(`${field} must be one of: ${rules.isIn.options.join(', ')}`);
        }
        
        if (rules.isISO8601) {
          validation = validation.isISO8601().withMessage(`Invalid ${field} date format`);
        }
        
        if (rules.isInt) {
          validation = validation.isInt(rules.isInt).withMessage(`${field} must be a valid integer`);
        }
        
        if (rules.isUUID) {
          validation = validation.isUUID().withMessage(`Invalid ${field} format`);
        }
        
        if (rules.isURL) {
          validation = validation.isURL().withMessage(`Invalid ${field} URL format`);
        }
        
        if (rules.isArray) {
          validation = validation.isArray().withMessage(`${field} must be an array`);
        }
        
        if (rules.isObject) {
          validation = validation.isObject().withMessage(`${field} must be an object`);
        }
        
        validations.push(validation);
      });
    }
    
    // Handle query validation
    if (schema.query) {
      Object.keys(schema.query).forEach(field => {
        const rules = schema.query[field];
        let validation = query(field);
        
        if (rules.optional) {
          validation = validation.optional();
        } else {
          validation = validation.notEmpty().withMessage(`${field} is required`);
        }
        
        if (rules.isISO8601) {
          validation = validation.isISO8601().withMessage(`Invalid ${field} date format`);
        }
        
        if (rules.isIn) {
          validation = validation.isIn(rules.isIn.options).withMessage(`${field} must be one of: ${rules.isIn.options.join(', ')}`);
        }
        
        validations.push(validation);
      });
    }
    
    // Handle params validation
    if (schema.params) {
      Object.keys(schema.params).forEach(field => {
        const rules = schema.params[field];
        let validation = param(field);
        
        if (rules.optional) {
          validation = validation.optional();
        } else {
          validation = validation.notEmpty().withMessage(`${field} is required`);
        }
        
        if (rules.isUUID) {
          validation = validation.isUUID().withMessage(`Invalid ${field} format`);
        }
        
        validations.push(validation);
      });
    }
    
    // Apply all validations and check results
    Promise.all(validations.map(validation => validation.run(req)))
      .then(() => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const errorDetails = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
          }));
          
          throw new ValidationError('Validation failed', errorDetails);
        }
        next();
      })
      .catch(next);
  };
};

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    throw new ValidationError('Validation failed', errorDetails);
  }
  next();
};

module.exports = {
  validateResumeGeneration,
  validatePdfExport,
  validateAuthRegistration,
  validateAuthLogin,
  validateJobCreation,
  validateJobUpdate,
  validateResumeUpload,
  validateJobAnalysis,
  validateInterviewScheduling,
  validateChatMessage,
  validateFileUpload,
  validateJobApplication,
  validateApplicationRetrieval,
  validateRequest,
  handleValidationErrors
}; 