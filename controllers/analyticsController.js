const logger = require('../utils/logger');
const { supabase } = require('../utils/supabaseClient');

// In-memory storage for rate limiting analytics (in production, use Redis)
const rateLimitStats = new Map();

exports.getApiAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    logger.info('Fetching API analytics', { startDate, endDate, groupBy });

    // Get user statistics
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, created_at, role, is_pro');

    if (usersError) {
      logger.error('Error fetching users for analytics:', usersError);
      return next(usersError);
    }

    // Get job statistics
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, created_at, status');

    if (jobsError) {
      logger.error('Error fetching jobs for analytics:', jobsError);
      return next(jobsError);
    }

    // Get candidate statistics
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('id, created_at, status');

    if (candidatesError) {
      logger.error('Error fetching candidates for analytics:', candidatesError);
      return next(candidatesError);
    }

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
      const { error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        health.database = 'unhealthy';
        health.databaseError = error.message;
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