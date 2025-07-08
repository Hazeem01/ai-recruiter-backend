const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiting for company endpoints
const companyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many company requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all company routes
router.use(companyLimiter);

// Create a new company
router.post('/', 
  authenticateToken,
  validateRequest({
    body: {
      name: { isLength: { min: 2, max: 255 } },
      description: { optional: true, isLength: { max: 1000 } },
      website: { optional: true, isURL: true },
      industry: { optional: true, isLength: { max: 100 } },
      size: { optional: true, isIn: { options: ['startup', 'small', 'medium', 'large', 'enterprise'] } },
      location: { optional: true, isLength: { max: 255 } },
      foundedYear: { optional: true, isInt: { min: 1800, max: 2025 } }
    }
  }),
  companyController.createCompany
);

// Get company by ID
router.get('/:companyId', 
  authenticateToken,
  validateRequest({
    params: {
      companyId: { isUUID: true }
    }
  }),
  companyController.getCompanyById
);

// Update company
router.put('/:companyId', 
  authenticateToken,
  validateRequest({
    params: {
      companyId: { isUUID: true }
    },
    body: {
      name: { optional: true, isLength: { min: 2, max: 255 } },
      description: { optional: true, isLength: { max: 1000 } },
      website: { optional: true, isURL: true },
      industry: { optional: true, isLength: { max: 100 } },
      size: { optional: true, isIn: { options: ['startup', 'small', 'medium', 'large', 'enterprise'] } },
      location: { optional: true, isLength: { max: 255 } },
      foundedYear: { optional: true, isInt: { min: 1800, max: 2025 } },
      logoUrl: { optional: true, isURL: true }
    }
  }),
  companyController.updateCompany
);

// Get all companies with filters
router.get('/', 
  authenticateToken,
  validateRequest({
    query: {
      industry: { optional: true, isLength: { max: 100 } },
      size: { optional: true, isIn: { options: ['startup', 'small', 'medium', 'large', 'enterprise'] } },
      search: { optional: true, isLength: { max: 255 } },
      page: { optional: true, isInt: { min: 1 } },
      limit: { optional: true, isInt: { min: 1, max: 100 } }
    }
  }),
  companyController.getCompanies
);

// Get company users (recruiters in the company)
router.get('/:companyId/users', 
  authenticateToken,
  validateRequest({
    params: {
      companyId: { isUUID: true }
    }
  }),
  companyController.getCompanyUsers
);

// Add user to company
router.post('/:companyId/users', 
  authenticateToken,
  validateRequest({
    params: {
      companyId: { isUUID: true }
    },
    body: {
      userId: { isUUID: true }
    }
  }),
  companyController.addUserToCompany
);

// Remove user from company
router.delete('/:companyId/users/:userId', 
  authenticateToken,
  validateRequest({
    params: {
      companyId: { isUUID: true },
      userId: { isUUID: true }
    }
  }),
  companyController.removeUserFromCompany
);

module.exports = router; 