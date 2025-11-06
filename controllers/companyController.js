const { db } = require('../utils/dbClient');
const logger = require('../utils/logger');
const { ValidationError } = require('../middleware/errorHandler');

// Create a new company
exports.createCompany = async (req, res, next) => {
  const { name, description, website, industry, size, location, foundedYear } = req.body;
  const userId = req.user?.id;

  try {
    logger.info('Company creation attempt', { name, userId });

    // Validate required fields
    if (!name) {
      throw new ValidationError('Company name is required');
    }

    // Check if company already exists
    const existingCompanies = await db.getCompanies({ search: name });
    if (existingCompanies.success && existingCompanies.data.length > 0) {
      const existingCompany = existingCompanies.data.find(company => 
        company.name.toLowerCase() === name.toLowerCase()
      );
      if (existingCompany) {
        throw new ValidationError('Company with this name already exists');
      }
    }

    // Create company data
    const companyData = {
      name: name.trim(),
      description: description?.trim(),
      website: website?.trim(),
      industry: industry?.trim(),
      size: size,
      location: location?.trim(),
      founded_year: foundedYear,
      created_at: new Date().toISOString()
    };

    const result = await db.createCompany(companyData);
    if (!result.success) {
      throw new Error(result.error);
    }

    // If user is creating the company, associate them with it
    if (userId) {
      await db.updateUser(userId, { company_id: result.data.id });
    }

    logger.info('Company created successfully', { companyId: result.data.id, name });

    res.status(201).json({
      success: true,
      data: {
        company: result.data
      }
    });

  } catch (error) {
    logger.error('Company creation error', { error: error.message });
    next(error);
  }
};

// Get company by ID
exports.getCompanyById = async (req, res, next) => {
  const { companyId } = req.params;

  try {
    logger.info('Getting company by ID', { companyId });

    const result = await db.getCompanyById(companyId);
    if (!result.success) {
      throw new Error(result.error);
    }

    if (!result.data) {
      throw new ValidationError('Company not found');
    }

    res.status(200).json({
      success: true,
      data: {
        company: result.data
      }
    });

  } catch (error) {
    logger.error('Get company error', { error: error.message });
    next(error);
  }
};

// Update company
exports.updateCompany = async (req, res, next) => {
  const { companyId } = req.params;
  const { name, description, website, industry, size, location, foundedYear, logoUrl } = req.body;
  const userId = req.user?.id;

  try {
    logger.info('Company update attempt', { companyId, userId });

    // Check if user has permission to update this company
    const userResult = await db.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      throw new ValidationError('User not found');
    }

    const user = userResult.data;
    if (user.company_id !== companyId && user.role !== 'admin') {
      throw new ValidationError('You do not have permission to update this company');
    }

    // Get current company data
    const companyResult = await db.getCompanyById(companyId);
    if (!companyResult.success || !companyResult.data) {
      throw new ValidationError('Company not found');
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (website !== undefined) updateData.website = website?.trim();
    if (industry !== undefined) updateData.industry = industry?.trim();
    if (size) updateData.size = size;
    if (location !== undefined) updateData.location = location?.trim();
    if (foundedYear !== undefined) updateData.founded_year = foundedYear;
    if (logoUrl !== undefined) updateData.logo_url = logoUrl;

    const result = await db.updateCompany(companyId, updateData);
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Company updated successfully', { companyId });

    res.status(200).json({
      success: true,
      data: {
        company: result.data
      }
    });

  } catch (error) {
    logger.error('Company update error', { error: error.message });
    next(error);
  }
};

// Get all companies with filters
exports.getCompanies = async (req, res, next) => {
  const { industry, size, search, page = 1, limit = 20 } = req.query;

  try {
    logger.info('Getting companies', { filters: { industry, size, search } });

    const filters = {};
    if (industry) filters.industry = industry;
    if (size) filters.size = size;
    if (search) filters.search = search;

    const result = await db.getCompanies(filters);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedData = result.data.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        companies: paginatedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.data.length,
          totalPages: Math.ceil(result.data.length / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get companies error', { error: error.message });
    next(error);
  }
};

// Get company users (recruiters in the company)
exports.getCompanyUsers = async (req, res, next) => {
  const { companyId } = req.params;
  const userId = req.user?.id;

  try {
    logger.info('Getting company users', { companyId, userId });

    // Check if user has permission to view this company's users
    const userResult = await db.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      throw new ValidationError('User not found');
    }

    const user = userResult.data;
    if (user.company_id !== companyId && user.role !== 'admin') {
      throw new ValidationError('You do not have permission to view this company\'s users');
    }

    const result = await db.getCompanyUsers(companyId);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Filter to only show recruiters and admins
    const recruiters = result.data.filter(user => 
      user.role === 'recruiter' || user.role === 'admin'
    );

    res.status(200).json({
      success: true,
      data: {
        users: recruiters
      }
    });

  } catch (error) {
    logger.error('Get company users error', { error: error.message });
    next(error);
  }
};

// Add user to company
exports.addUserToCompany = async (req, res, next) => {
  const { companyId } = req.params;
  const { userId } = req.body;
  const currentUserId = req.user?.id;

  try {
    logger.info('Adding user to company', { companyId, userId, currentUserId });

    // Check if current user has permission
    const currentUserResult = await db.getUserById(currentUserId);
    if (!currentUserResult.success || !currentUserResult.data) {
      throw new ValidationError('Current user not found');
    }

    const currentUser = currentUserResult.data;
    if (currentUser.company_id !== companyId && currentUser.role !== 'admin') {
      throw new ValidationError('You do not have permission to add users to this company');
    }

    // Check if target user exists
    const targetUserResult = await db.getUserById(userId);
    if (!targetUserResult.success || !targetUserResult.data) {
      throw new ValidationError('Target user not found');
    }

    const targetUser = targetUserResult.data;
    if (targetUser.company_id) {
      throw new ValidationError('User is already associated with a company');
    }

    // Add user to company
    const result = await db.updateUser(userId, { company_id: companyId });
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('User added to company successfully', { companyId, userId });

    res.status(200).json({
      success: true,
      data: {
        user: result.data
      }
    });

  } catch (error) {
    logger.error('Add user to company error', { error: error.message });
    next(error);
  }
};

// Remove user from company
exports.removeUserFromCompany = async (req, res, next) => {
  const { companyId, userId } = req.params;
  const currentUserId = req.user?.id;

  try {
    logger.info('Removing user from company', { companyId, userId, currentUserId });

    // Check if current user has permission
    const currentUserResult = await db.getUserById(currentUserId);
    if (!currentUserResult.success || !currentUserResult.data) {
      throw new ValidationError('Current user not found');
    }

    const currentUser = currentUserResult.data;
    if (currentUser.company_id !== companyId && currentUser.role !== 'admin') {
      throw new ValidationError('You do not have permission to remove users from this company');
    }

    // Check if target user exists and is in the company
    const targetUserResult = await db.getUserById(userId);
    if (!targetUserResult.success || !targetUserResult.data) {
      throw new ValidationError('Target user not found');
    }

    const targetUser = targetUserResult.data;
    if (targetUser.company_id !== companyId) {
      throw new ValidationError('User is not associated with this company');
    }

    // Remove user from company
    const result = await db.updateUser(userId, { company_id: null });
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('User removed from company successfully', { companyId, userId });

    res.status(200).json({
      success: true,
      data: {
        user: result.data
      }
    });

  } catch (error) {
    logger.error('Remove user from company error', { error: error.message });
    next(error);
  }
};

// Get public jobs (for applicants to browse)
exports.getPublicJobs = async (req, res, next) => {
  const { status, search, page = 1, limit = 10 } = req.query;

  try {
    logger.info('Getting public jobs', { filters: { status, search, page, limit } });

    const filters = { status: status || 'active' };
    if (search) filters.search = search;

    const result = await db.getJobs(filters);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedJobs = result.data.slice(startIndex, endIndex);

    const response = {
      jobs: paginatedJobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.data.length / limit),
        totalJobs: result.data.length,
        hasNextPage: endIndex < result.data.length,
        hasPrevPage: page > 1
      }
    };

    logger.info('Public jobs retrieved successfully', { count: paginatedJobs.length });

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error getting public jobs', { error: error.message });
    next(error);
  }
}; 