const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../utils/dbClient');
const logger = require('../utils/logger');
const { ValidationError } = require('../middleware/errorHandler');
const { sendPasswordResetEmail } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

exports.register = async (req, res, next) => {
  const { email, password, firstName, lastName, role = 'applicant', company } = req.body;

  try {
    logger.info('User registration attempt', { email, role });

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new ValidationError('Missing required fields: email, password, firstName, lastName');
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser.success && existingUser.data) {
      throw new ValidationError('User with this email already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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

    // Create user in database with hashed password
    const userData = {
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: role,
      company_id: companyId,
      password_hash: hashedPassword // Store hashed password
    };

    const dbResult = await db.createUser(userData);
    logger.info('Database user creation result', { 
      success: dbResult.success, 
      error: dbResult.error,
      userId: dbResult.data?.id 
    });
    
    if (!dbResult.success) {
      throw new Error(dbResult.error);
    }

    // Generate JWT token
    const token = generateToken(dbResult.data.id, role);

    logger.info('User registered successfully', { userId: dbResult.data.id, role, companyId });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: dbResult.data.id,
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

    // Get user from database (include password_hash for verification)
    const userResult = await db.getUserByEmail(email, true);
    if (!userResult.success || !userResult.data) {
      throw new ValidationError('Invalid email or password');
    }

    const user = userResult.data;

    // Check if user needs to set/reset password (migrated from Supabase)
    if (!user.password_hash) {
      logger.warn('User has no password hash - needs password reset', { userId: user.id, email });
      return res.status(403).json({
        success: false,
        error: {
          message: 'Password reset required',
          code: 'PASSWORD_RESET_REQUIRED',
          details: 'Your account was migrated from our previous system. Please reset your password to continue.'
        },
        data: {
          requiresPasswordReset: true,
          email: user.email
        }
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new ValidationError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    logger.info('User logged in successfully', { userId: user.id });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          companyId: user.company_id
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

    // Since we're using JWT tokens, logout is handled client-side
    // by removing the token. No server-side action needed.
    // Optionally, you could implement a token blacklist here.

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
    // User is already authenticated via middleware and added to req.user
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get user profile from database (already available in req.user, but refresh to get latest)
    const userResult = await db.getUserById(req.user.id);
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

// Request password reset (send reset email)
exports.requestPasswordReset = async (req, res, next) => {
  const { email } = req.body;

  try {
    logger.info('Password reset request', { email });

    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Get user by email
    const userResult = await db.getUserByEmail(email);
    if (!userResult.success || !userResult.data) {
      // Don't reveal if user exists for security
      logger.info('Password reset requested for non-existent email', { email });
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const user = userResult.data;

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store token in database
    const tokenResult = await db.createPasswordResetToken(
      user.id,
      resetToken,
      expiresAt.toISOString()
    );

    if (!tokenResult.success) {
      logger.error('Failed to create password reset token', { 
        userId: user.id, 
        error: tokenResult.error 
      });
      throw new Error('Failed to create password reset token');
    }

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      resetToken,
      user.first_name || 'User'
    );

    if (!emailResult.success) {
      logger.warn('Failed to send password reset email', { 
        email: user.email, 
        error: emailResult.error 
      });
      if (process.env.NODE_ENV === 'development' && emailResult.resetLink) {
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
          data: {
            // Only in development - remove in production
            resetLink: emailResult.resetLink,
            note: 'Email service not configured. Use this link for testing.'
          }
        });
      }
    }

    logger.info('Password reset requested successfully', { 
      userId: user.id, 
      email: user.email 
    });

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    logger.error('Password reset request error', { error: error.message });
    next(error);
  }
};

// Reset password (with token)
exports.resetPassword = async (req, res, next) => {
  const { resetToken, newPassword } = req.body;

  try {
    logger.info('Password reset attempt', { hasToken: !!resetToken });

    if (!resetToken || !newPassword) {
      throw new ValidationError('Reset token and new password are required');
    }

    if (newPassword.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long');
    }

    // Verify and get reset token from database
    const tokenResult = await db.getPasswordResetToken(resetToken);
    if (!tokenResult.success || !tokenResult.data) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const tokenData = tokenResult.data;
    const userId = tokenData.user_id;

    // Check if token is expired (additional check, though database query already filters expired)
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      throw new ValidationError('Reset token has expired');
    }

    // Get user to verify they still exist
    const userResult = await db.getUserByEmail(tokenData.email, true);
    if (!userResult.success || !userResult.data) {
      throw new ValidationError('User not found');
    }

    const user = userResult.data;

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    const updateResult = await db.updateUser(user.id, { password_hash: hashedPassword });
    if (!updateResult.success) {
      throw new Error(updateResult.error);
    }

    // Mark token as used
    await db.markPasswordResetTokenAsUsed(resetToken);

    logger.info('Password reset successful', { userId: user.id, email: user.email });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
      data: {
        email: user.email
      }
    });

  } catch (error) {
    logger.error('Password reset error', { error: error.message });
    next(error);
  }
}; 