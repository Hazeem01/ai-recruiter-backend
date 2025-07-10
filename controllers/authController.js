const jwt = require('jsonwebtoken');
const { auth, db } = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { ValidationError } = require('../middleware/errorHandler');

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET;

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// User registration
exports.register = async (req, res, next) => {
  const { email, password, firstName, lastName, role = 'applicant', company } = req.body;

  try {
    logger.info('User registration attempt', { email, role });

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new ValidationError('Missing required fields: email, password, firstName, lastName');
    }

    // Check if user already exists by email
    const existingUser = await db.getUserByEmail(email);
    if (existingUser.success && existingUser.data) {
      throw new ValidationError('User with this email already exists');
    }

    // Create user in Supabase Auth
    const authResult = await auth.signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      role: role
    });

    logger.info('Supabase Auth signup result', { 
      success: authResult.success, 
      hasUser: !!authResult.data?.user,
      userId: authResult.data?.user?.id,
      error: authResult.error 
    });

    if (!authResult.success) {
      throw new Error(authResult.error);
    }

    // Handle company creation for recruiters
    let companyId = null;
    if (role === 'recruiter' && company) {
      // Check if company already exists
      const existingCompanies = await db.getCompanies({ search: company.name });
      if (existingCompanies.success && existingCompanies.data.length > 0) {
        const existingCompany = existingCompanies.data.find(c => 
          c.name.toLowerCase() === company.name.toLowerCase()
        );
        if (existingCompany) {
          companyId = existingCompany.id;
        }
      }

      // Create new company if it doesn't exist
      if (!companyId) {
        const companyData = {
          name: company.name.trim(),
          description: company.description?.trim(),
          website: company.website?.trim(),
          industry: company.industry?.trim(),
          size: company.size,
          location: company.location?.trim(),
          founded_year: company.foundedYear,
          created_at: new Date().toISOString()
        };

        const companyResult = await db.createCompany(companyData);
        if (companyResult.success) {
          companyId = companyResult.data.id;
          logger.info('Company created during registration', { companyId: companyResult.data.id, name: company.name });
        } else {
          logger.warn('Failed to create company during registration', { error: companyResult.error });
        }
      }
    }

    // Update user profile in database (Supabase Auth already created the user)
    const userData = {
      id: authResult.data.user.id, // Use Supabase Auth user ID
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: role,
      company_id: companyId,
      created_at: new Date().toISOString()
    };

    const dbResult = await db.updateUserProfile(userData);
    logger.info('Database user profile update result', { 
      success: dbResult.success, 
      error: dbResult.error,
      userId: userData.id 
    });
    
    if (!dbResult.success) {
      throw new Error(dbResult.error);
    }

    // Generate JWT token
    const token = generateToken(authResult.data.user.id, role);

    logger.info('User registered successfully', { userId: authResult.data.user.id, role, companyId });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: authResult.data.user.id,
          email: email,
          firstName: firstName,
          lastName: lastName,
          role: role,
          companyId: companyId
        },
        token: token
      }
    });

  } catch (error) {
    logger.error('Registration error', { error: error.message });
    next(error);
  }
};

// User login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    logger.info('User login attempt', { email });

    // Validate required fields
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Sign in with Supabase Auth
    const authResult = await auth.signIn(email, password);
    if (!authResult.success) {
      throw new ValidationError('Invalid email or password');
    }

    // Get user profile from database
    const userResult = await db.getUserById(authResult.data.user.id);
    if (!userResult.success) {
      throw new Error('User profile not found');
    }

    // Generate JWT token
    const token = generateToken(authResult.data.user.id, userResult.data.role);

    logger.info('User logged in successfully', { userId: authResult.data.user.id });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: authResult.data.user.id,
          email: userResult.data.email,
          firstName: userResult.data.first_name,
          lastName: userResult.data.last_name,
          role: userResult.data.role,
          companyId: userResult.data.company_id
        },
        token: token
      }
    });

  } catch (error) {
    logger.error('Login error', { error: error.message });
    next(error);
  }
};

// User logout
exports.logout = async (req, res, next) => {
  try {
    logger.info('User logout attempt', { userId: req.user?.id });

    // Sign out from Supabase Auth
    const authResult = await auth.signOut();
    if (!authResult.success) {
      logger.warn('Supabase logout failed', { error: authResult.error });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error', { error: error.message });
    next(error);
  }
};

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    // Get current user from Supabase Auth
    const authResult = await auth.getCurrentUser();
    if (!authResult.success) {
      throw new ValidationError('User not authenticated');
    }

    // Get user profile from database
    const userResult = await db.getUserById(authResult.data.id);
    if (!userResult.success) {
      throw new Error('User profile not found');
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: userResult.data.id,
          email: userResult.data.email,
          firstName: userResult.data.first_name,
          lastName: userResult.data.last_name,
          role: userResult.data.role,
          companyId: userResult.data.company_id,
          createdAt: userResult.data.created_at
        }
      }
    });

  } catch (error) {
    logger.error('Get current user error', { error: error.message });
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  const { firstName, lastName, companyId } = req.body;
  const userId = req.user?.id;

  try {
    logger.info('Profile update attempt', { userId });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const updates = {};
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (companyId) updates.company_id = companyId;

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No updates provided');
    }

    const result = await db.updateUser(userId, updates);
    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Profile updated successfully', { userId });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.data.id,
          email: result.data.email,
          firstName: result.data.first_name,
          lastName: result.data.last_name,
          role: result.data.role,
          company: result.data.company
        }
      }
    });

  } catch (error) {
    logger.error('Profile update error', { error: error.message });
    next(error);
  }
}; 