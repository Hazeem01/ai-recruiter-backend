const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access token is required'
        }
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      logger.warn('Invalid token - user not found', { userId: decoded.userId });
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token'
        }
      });
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    logger.error('Token verification failed:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired'
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        message: 'Authentication error'
      }
    });
  }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

// Middleware to check if user is pro (for premium features)
const requirePro = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required'
      }
    });
  }

  if (!req.user.is_pro) {
    logger.warn('Access denied - pro subscription required', {
      userId: req.user.id
    });

    return res.status(403).json({
      success: false,
      error: {
        message: 'Pro subscription required for this feature'
      }
    });
  }

  next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without user
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (!error && user) {
      req.user = user;
    }

    next();

  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePro,
  optionalAuth
}; 