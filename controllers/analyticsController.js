const logger = require('../utils/logger');
const { db } = require('../utils/dbClient');

// In-memory storage for rate limiting analytics (in production, use Redis)
const rateLimitStats = new Map();

exports.getApiAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    logger.info('Fetching API analytics', { startDate, endDate, groupBy });

    // Get user statistics
    const usersResult = await db.getCompanyUsers(null); // Get all users (we'll need a new method)
    // For now, let's use a direct query approach
    const { pool } = require('../utils/databaseClient');
    const client = await pool.connect();
    
    try {
      const usersQuery = await client.query('SELECT id, created_at, role, is_pro FROM users');
      const users = usersQuery.rows;

      // Get job statistics
      const jobsQuery = await client.query('SELECT id, created_at, status FROM jobs');
      const jobs = jobsQuery.rows;

      // Get candidate statistics
      const candidatesQuery = await client.query('SELECT id, created_at, status FROM candidates');
      const candidates = candidatesQuery.rows;

    // Calculate analytics
    const analytics = {
      users: {
        total: users.length,
        byRole: {
          applicant: users.filter(u => u.role === 'applicant').length,
          recruiter: users.filter(u => u.role === 'recruiter').length,
          admin: users.filter(u => u.role === 'admin').length
        },
        proUsers: users.filter(u => u.is_pro).length
      },
      jobs: {
        total: jobs.length,
        byStatus: {
          active: jobs.filter(j => j.status === 'active').length,
          paused: jobs.filter(j => j.status === 'paused').length,
          closed: jobs.filter(j => j.status === 'closed').length
        }
      },
      candidates: {
        total: candidates.length,
        byStatus: {
          applied: candidates.filter(c => c.status === 'applied').length,
          reviewing: candidates.filter(c => c.status === 'reviewing').length,
          interviewing: candidates.filter(c => c.status === 'interviewing').length,
          offered: candidates.filter(c => c.status === 'offered').length,
          rejected: candidates.filter(c => c.status === 'rejected').length
        }
      },
      rateLimiting: {
        totalRequests: Array.from(rateLimitStats.values()).reduce((sum, stat) => sum + stat.count, 0),
        blockedRequests: Array.from(rateLimitStats.values()).reduce((sum, stat) => sum + stat.blocked, 0)
      }
    };

      res.status(200).json({
        success: true,
        data: analytics
      });
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error generating analytics:', error);
    next(error);
  }
};

exports.getRateLimitStats = async (req, res, next) => {
  try {
    const stats = Array.from(rateLimitStats.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      blocked: data.blocked,
      lastRequest: data.lastRequest
    }));

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalIPs: stats.length,
        totalRequests: stats.reduce((sum, stat) => sum + stat.count, 0),
        totalBlocked: stats.reduce((sum, stat) => sum + stat.blocked, 0)
      }
    });

  } catch (error) {
    logger.error('Error fetching rate limit stats:', error);
    next(error);
  }
};

exports.recordRateLimitHit = (ip) => {
  const now = Date.now();
  const stats = rateLimitStats.get(ip) || { count: 0, blocked: 0, lastRequest: now };
  
  stats.count++;
  stats.lastRequest = now;
  
  rateLimitStats.set(ip, stats);
};

exports.recordRateLimitBlock = (ip) => {
  const stats = rateLimitStats.get(ip) || { count: 0, blocked: 0, lastRequest: Date.now() };
  
  stats.blocked++;
  rateLimitStats.set(ip, stats);
};

exports.getSystemHealth = async (req, res, next) => {
  try {
    const health = {
      database: 'healthy',
      ai: 'healthy',
      storage: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Test database connection
    try {
      const { testConnection } = require('../utils/databaseClient');
      const isConnected = await testConnection();
      if (!isConnected) {
        health.database = 'unhealthy';
        health.databaseError = 'Connection test failed';
      }
    } catch (dbError) {
      health.database = 'unhealthy';
      health.databaseError = dbError.message;
    }

    // Test AI provider connection
    try {
      const aiProvider = require('../utils/aiProvider');
      await aiProvider.testConnection();
      health.ai = 'healthy';
    } catch (aiError) {
      health.ai = 'unhealthy';
      health.aiError = aiError.message;
    }

    const overallStatus = Object.values(health).every(status => 
      status === 'healthy' || typeof status !== 'string'
    ) ? 'healthy' : 'degraded';

    res.status(200).json({
      success: true,
      data: {
        status: overallStatus,
        ...health
      }
    });

  } catch (error) {
    logger.error('Error checking system health:', error);
    next(error);
  }
}; 