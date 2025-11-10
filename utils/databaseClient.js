require('dotenv').config();
const { Pool } = require('pg');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const getDatabaseConfig = () => {
  // Support both DATABASE_URL and individual connection parameters
  if (process.env.DATABASE_URL) {
    // Parse DATABASE_URL to extract connection parameters
    // This gives us more control over SSL configuration
    try {
      let databaseUrl = process.env.DATABASE_URL;
      
      // Log sanitized URL for debugging (hide password)
      const sanitizedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
      logger.info('Parsing DATABASE_URL', { 
        urlLength: databaseUrl.length,
        hasProtocol: databaseUrl.includes('://'),
        sanitizedUrl: sanitizedUrl.substring(0, 100) // First 100 chars
      });
      
      // Ensure URL has protocol
      if (!databaseUrl.includes('://')) {
        // If no protocol, assume postgresql://
        databaseUrl = `postgresql://${databaseUrl}`;
        logger.info('Added postgresql:// protocol to DATABASE_URL');
      }
      
      const url = new URL(databaseUrl);
      const sslMode = url.searchParams.get('sslmode') || 'require';
      
      // Validate required components
      if (!url.hostname || !url.username || !url.password) {
        throw new Error('DATABASE_URL missing required components (hostname, username, or password)');
      }
      
      // Extract database name from pathname
      let databaseName = url.pathname.slice(1); // Remove leading '/'
      if (!databaseName || databaseName === '') {
        // If no database in URL, try environment variable or default
        databaseName = process.env.DB_NAME || 'postgres';
        logger.warn('No database name in DATABASE_URL, using fallback', { databaseName });
      }
      
      // Build connection config from parsed URL
      const config = {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: databaseName,
        user: url.username,
        password: url.password,
        // Always set SSL for DigitalOcean (they require it)
        ssl: {
          rejectUnauthorized: false // Required for DigitalOcean's self-signed certificates
        },
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
      
      logger.info('Database config parsed from DATABASE_URL', {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        sslEnabled: true
      });
      
      return config;
    } catch (error) {
      logger.error('Error parsing DATABASE_URL, falling back to connectionString', { 
        error: error.message,
        errorStack: error.stack
      });
      
      // Log sanitized DATABASE_URL for debugging
      const sanitizedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
      logger.warn('Using connectionString fallback', {
        urlLength: process.env.DATABASE_URL.length,
        sanitizedUrl: sanitizedUrl.substring(0, 100)
      });
      
      // Fallback to connectionString if parsing fails
      // Ensure connectionString has proper format
      let connectionString = process.env.DATABASE_URL;
      if (!connectionString.includes('://')) {
        connectionString = `postgresql://${connectionString}`;
      }
      // Ensure SSL mode is set
      if (!connectionString.includes('sslmode=')) {
        connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
      }
      
      return {
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false // Required for DigitalOcean's self-signed certificates
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
    }
  }

  // Individual connection parameters
  const sslEnabled = process.env.DB_SSL === 'true' || process.env.DB_SSL === 'require' || !process.env.DB_SSL;
  // Default to SSL enabled for DigitalOcean
  
  return {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: sslEnabled ? {
      rejectUnauthorized: false // Required for DigitalOcean's self-signed certificates
    } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
};

// Create connection pool
const pool = new Pool(getDatabaseConfig());

// Test database connection
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

// Database table names
const TABLES = {
  USERS: 'users',
  COMPANIES: 'companies',
  JOBS: 'jobs',
  CANDIDATES: 'candidates',
  RESUMES: 'resumes',
  INTERVIEWS: 'interviews',
  CHAT_HISTORY: 'chat_history',
  FILES: 'files',
  PRO_SIGNUPS: 'pro_signups',
  PASSWORD_RESET_TOKENS: 'password_reset_tokens'
};

// User roles
const ROLES = {
  RECRUITER: 'recruiter',
  APPLICANT: 'applicant',
  ADMIN: 'admin'
};

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  const camelObj = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    camelObj[camelKey] = obj[key];
  }
  return camelObj;
};

// Helper function to convert camelCase to snake_case
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  
  const snakeObj = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    snakeObj[snakeKey] = obj[key];
  }
  return snakeObj;
};

// Database operations
const db = {
  // User operations
  async createUser(userData) {
    const client = await pool.connect();
    try {
      const userId = userData.id || uuidv4();
      const query = `
        INSERT INTO ${TABLES.USERS} (id, email, first_name, last_name, role, company_id, avatar_url, is_pro, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, email, first_name, last_name, role, company_id, avatar_url, is_pro, created_at, updated_at
      `;
      const values = [
        userId,
        userData.email,
        userData.first_name || userData.firstName,
        userData.last_name || userData.lastName,
        userData.role || 'applicant',
        userData.company_id || userData.companyId || null,
        userData.avatar_url || userData.avatarUrl || null,
        userData.is_pro || userData.isPro || false,
        userData.password_hash || null
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error creating user', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getUserById(userId) {
    const client = await pool.connect();
    try {
      // Exclude password_hash from regular queries for security
      const query = `SELECT id, email, first_name, last_name, role, company_id, avatar_url, is_pro, created_at, updated_at FROM ${TABLES.USERS} WHERE id = $1`;
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error getting user', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getUserByEmail(email, includePassword = false) {
    const client = await pool.connect();
    try {
      // Include password_hash only when needed for authentication
      const fields = includePassword 
        ? '*' 
        : 'id, email, first_name, last_name, role, company_id, avatar_url, is_pro, created_at, updated_at';
      const query = `SELECT ${fields} FROM ${TABLES.USERS} WHERE email = $1`;
      const result = await client.query(query, [email]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error getting user by email', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async updateUser(userId, updates) {
    const client = await pool.connect();
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        updateFields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `
        UPDATE ${TABLES.USERS}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error updating user', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async updateUserProfile(userData) {
    const client = await pool.connect();
    try {
      const userId = userData.id || uuidv4();
      const query = `
        INSERT INTO ${TABLES.USERS} (id, email, first_name, last_name, role, company_id, avatar_url, is_pro, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          company_id = EXCLUDED.company_id,
          avatar_url = EXCLUDED.avatar_url,
          is_pro = EXCLUDED.is_pro,
          updated_at = NOW()
        RETURNING *
      `;
      const values = [
        userId,
        userData.email,
        userData.first_name || userData.firstName,
        userData.last_name || userData.lastName,
        userData.role || 'applicant',
        userData.company_id || userData.companyId || null,
        userData.avatar_url || userData.avatarUrl || null,
        userData.is_pro || userData.isPro || false
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error updating user profile', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // Company operations
  async createCompany(companyData) {
    const client = await pool.connect();
    try {
      const companyId = companyData.id || uuidv4();
      const query = `
        INSERT INTO ${TABLES.COMPANIES} (id, name, description, website, industry, size, location, founded_year, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        companyId,
        companyData.name,
        companyData.description || null,
        companyData.website || null,
        companyData.industry || null,
        companyData.size || null,
        companyData.location || null,
        companyData.founded_year || companyData.foundedYear || null
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error creating company', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getCompanyById(companyId) {
    const client = await pool.connect();
    try {
      const query = `SELECT * FROM ${TABLES.COMPANIES} WHERE id = $1`;
      const result = await client.query(query, [companyId]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Company not found' };
      }
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error getting company', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async updateCompany(companyId, updates) {
    const client = await pool.connect();
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        updateFields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(companyId);

      const query = `
        UPDATE ${TABLES.COMPANIES}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Company not found' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error updating company', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getCompanies(filters = {}) {
    const client = await pool.connect();
    try {
      let query = `SELECT * FROM ${TABLES.COMPANIES} WHERE 1=1`;
      const values = [];
      let paramIndex = 1;

      if (filters.industry) {
        query += ` AND industry = $${paramIndex}`;
        values.push(filters.industry);
        paramIndex++;
      }

      if (filters.size) {
        query += ` AND size = $${paramIndex}`;
        values.push(filters.size);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND name ILIKE $${paramIndex}`;
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      query += ` ORDER BY name ASC`;

      const result = await client.query(query, values);
      return { success: true, data: result.rows };
    } catch (error) {
      logger.error('Error getting companies', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getCompanyUsers(companyId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM ${TABLES.USERS}
        WHERE company_id = $1
        ORDER BY created_at DESC
      `;
      const result = await client.query(query, [companyId]);
      return { success: true, data: result.rows };
    } catch (error) {
      logger.error('Error getting company users', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // Job operations
  async createJob(jobData) {
    const client = await pool.connect();
    try {
      const jobId = jobData.id || uuidv4();
      const query = `
        INSERT INTO ${TABLES.JOBS} (id, recruiter_id, company_id, title, company, location, description, requirements, salary_range, job_type, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        jobId,
        jobData.recruiter_id || jobData.recruiterId,
        jobData.company_id || jobData.companyId || null,
        jobData.title,
        jobData.company,
        jobData.location || null,
        jobData.description || null,
        jobData.requirements || null,
        jobData.salary_range || jobData.salaryRange || null,
        jobData.job_type || jobData.jobType || 'full-time',
        jobData.status || 'active'
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error creating job', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getJobs(filters = {}) {
    const client = await pool.connect();
    try {
      let query = `SELECT * FROM ${TABLES.JOBS} WHERE 1=1`;
      const values = [];
      let paramIndex = 1;

      if (filters.recruiter_id) {
        query += ` AND recruiter_id = $${paramIndex}`;
        values.push(filters.recruiter_id);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND title ILIKE $${paramIndex}`;
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await client.query(query, values);
      return { success: true, data: result.rows };
    } catch (error) {
      logger.error('Error getting jobs', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async updateJob(jobId, updates) {
    const client = await pool.connect();
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        updateFields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(jobId);

      const query = `
        UPDATE ${TABLES.JOBS}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Job not found' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error updating job', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async deleteJob(jobId) {
    const client = await pool.connect();
    try {
      const query = `DELETE FROM ${TABLES.JOBS} WHERE id = $1`;
      await client.query(query, [jobId]);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting job', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // Candidate operations
  async createCandidate(candidateData) {
    const client = await pool.connect();
    try {
      const candidateId = candidateData.id || uuidv4();
      const query = `
        INSERT INTO ${TABLES.CANDIDATES} (id, user_id, job_id, status, resume_url, cover_letter_url, applied_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        candidateId,
        candidateData.user_id || candidateData.userId,
        candidateData.job_id || candidateData.jobId,
        candidateData.status || 'applied',
        candidateData.resume_url || candidateData.resumeUrl || null,
        candidateData.cover_letter_url || candidateData.coverLetterUrl || null
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error creating candidate', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getCandidates(filters = {}) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT c.*, 
               json_build_object(
                 'id', j.id,
                 'title', j.title,
                 'company', j.company,
                 'location', j.location,
                 'job_type', j.job_type,
                 'salary_range', j.salary_range,
                 'status', j.status
               ) as jobs
        FROM ${TABLES.CANDIDATES} c
        INNER JOIN ${TABLES.JOBS} j ON c.job_id = j.id
        WHERE 1=1
      `;
      const values = [];
      let paramIndex = 1;

      if (filters.recruiterId) {
        query += ` AND j.recruiter_id = $${paramIndex}`;
        values.push(filters.recruiterId);
        paramIndex++;
      }

      if (filters.jobId) {
        query += ` AND c.job_id = $${paramIndex}`;
        values.push(filters.jobId);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND c.status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }

      if (filters.userId) {
        query += ` AND c.user_id = $${paramIndex}`;
        values.push(filters.userId);
        paramIndex++;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = query.replace(
        'SELECT c.*, json_build_object',
        'SELECT COUNT(*)'
      ).replace(
        /ORDER BY.*$/i,
        ''
      );

      const countResult = await client.query(countQuery, values);
      const count = parseInt(countResult.rows[0].count);

      query += ` ORDER BY c.applied_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result = await client.query(query, values);
      return { success: true, data: result.rows, count };
    } catch (error) {
      logger.error('Error getting candidates', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // Resume operations
  async createResume(resumeData) {
    const client = await pool.connect();
    try {
      const resumeId = resumeData.id || uuidv4();
      const query = `
        INSERT INTO ${TABLES.RESUMES} (id, user_id, content, file_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        resumeId,
        resumeData.user_id || resumeData.userId,
        resumeData.content || null,
        resumeData.file_url || resumeData.fileUrl || null
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error creating resume', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getResumeById(resumeId) {
    const client = await pool.connect();
    try {
      const query = `SELECT * FROM ${TABLES.RESUMES} WHERE id = $1`;
      const result = await client.query(query, [resumeId]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Resume not found' };
      }
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error getting resume', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // Interview operations
  async createInterview(interviewData) {
    const client = await pool.connect();
    try {
      const interviewId = interviewData.id || uuidv4();
      const query = `
        INSERT INTO ${TABLES.INTERVIEWS} (id, candidate_id, scheduled_at, status, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        interviewId,
        interviewData.candidate_id || interviewData.candidateId,
        interviewData.scheduled_at || interviewData.scheduledAt,
        interviewData.status || 'scheduled',
        interviewData.notes || null
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error creating interview', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getInterviews(filters = {}) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT i.*, c.*, j.*
        FROM ${TABLES.INTERVIEWS} i
        INNER JOIN ${TABLES.CANDIDATES} c ON i.candidate_id = c.id
        INNER JOIN ${TABLES.JOBS} j ON c.job_id = j.id
        WHERE 1=1
      `;
      const values = [];
      let paramIndex = 1;

      if (filters.recruiter_id) {
        query += ` AND j.recruiter_id = $${paramIndex}`;
        values.push(filters.recruiter_id);
        paramIndex++;
      }

      if (filters.candidate_id) {
        query += ` AND i.candidate_id = $${paramIndex}`;
        values.push(filters.candidate_id);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND i.status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }

      query += ` ORDER BY i.scheduled_at ASC`;

      const result = await client.query(query, values);
      
      // Transform the result to match expected format
      const interviews = result.rows.map(row => {
        const interview = { ...row };
        interview.candidate = {
          id: row.candidate_id,
          user_id: row.user_id,
          job_id: row.job_id,
          status: row.candidate_status || row.status
        };
        interview.job = {
          id: row.job_id,
          title: row.title,
          company: row.company,
          location: row.location
        };
        return interview;
      });

      return { success: true, data: interviews };
    } catch (error) {
      logger.error('Error getting interviews', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // Chat operations
  async saveChatMessage(userId, message, response, context = 'general') {
    const client = await pool.connect();
    try {
      const messageId = uuidv4();
      const query = `
        INSERT INTO ${TABLES.CHAT_HISTORY} (id, user_id, message, response, context, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      const values = [messageId, userId, message, response, context];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error saving chat message', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getChatHistory(userId, limit = 50) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM ${TABLES.CHAT_HISTORY}
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      const result = await client.query(query, [userId, limit]);
      
      // Transform the data to match the expected format
      const transformedData = result.rows.reverse().map(row => [
        {
          role: 'user',
          content: row.message,
          created_at: row.created_at
        },
        {
          role: 'assistant',
          content: row.response,
          created_at: row.created_at
        }
      ]).flat();

      return { success: true, data: transformedData };
    } catch (error) {
      logger.error('Error getting chat history', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // File operations
  async createFile(fileData) {
    const client = await pool.connect();
    try {
      const fileId = fileData.id || uuidv4();
      const query = `
        INSERT INTO ${TABLES.FILES} (id, user_id, filename, original_name, file_path, file_size, file_url, mime_type, category, bucket_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *
      `;
      const values = [
        fileId,
        fileData.user_id || fileData.userId,
        fileData.filename,
        fileData.original_name || fileData.originalName || fileData.filename,
        fileData.file_path || fileData.filePath,
        fileData.file_size || fileData.fileSize,
        fileData.file_url || fileData.fileUrl || null,
        fileData.mime_type || fileData.mimeType,
        fileData.category || 'general',
        fileData.bucket_name || fileData.bucketName || 'files'
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error creating file record', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getFileById(fileId) {
    const client = await pool.connect();
    try {
      const query = `SELECT * FROM ${TABLES.FILES} WHERE id = $1`;
      const result = await client.query(query, [fileId]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'File not found' };
      }
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error getting file', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getUserFiles(userId, filters = {}) {
    const client = await pool.connect();
    try {
      let query = `SELECT * FROM ${TABLES.FILES} WHERE user_id = $1`;
      const values = [userId];
      let paramIndex = 2;

      if (filters.category) {
        query += ` AND category = $${paramIndex}`;
        values.push(filters.category);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
      const countResult = await client.query(countQuery, values);
      const count = parseInt(countResult.rows[0].count);

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result = await client.query(query, values);
      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: {
          files: result.rows,
          pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalFiles: count,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            limit: limit
          }
        }
      };
    } catch (error) {
      logger.error('Error getting user files', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async deleteFileById(fileId) {
    const client = await pool.connect();
    try {
      const query = `DELETE FROM ${TABLES.FILES} WHERE id = $1 RETURNING *`;
      const result = await client.query(query, [fileId]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'File not found' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error deleting file record', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // Pro signup operations
  async createProSignup(signupData) {
    const client = await pool.connect();
    try {
      const signupId = signupData.id || uuidv4();
      const query = `
        INSERT INTO ${TABLES.PRO_SIGNUPS} (id, user_id, email, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const values = [
        signupId,
        signupData.user_id || signupData.userId,
        signupData.email
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error creating pro signup', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // Password reset token operations
  async createPasswordResetToken(userId, token, expiresAt) {
    const client = await pool.connect();
    try {
      // Invalidate any existing tokens for this user
      await client.query(
        `UPDATE ${TABLES.PASSWORD_RESET_TOKENS} SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
        [userId]
      );

      // Create new token
      const tokenId = uuidv4();
      const query = `
        INSERT INTO ${TABLES.PASSWORD_RESET_TOKENS} (id, user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;
      const values = [tokenId, userId, token, expiresAt];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error creating password reset token', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async getPasswordResetToken(token) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT prt.*, u.email, u.first_name, u.last_name
        FROM ${TABLES.PASSWORD_RESET_TOKENS} prt
        INNER JOIN ${TABLES.USERS} u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()
        ORDER BY prt.created_at DESC
        LIMIT 1
      `;
      const result = await client.query(query, [token]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid or expired token' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error getting password reset token', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async markPasswordResetTokenAsUsed(token) {
    const client = await pool.connect();
    try {
      const query = `
        UPDATE ${TABLES.PASSWORD_RESET_TOKENS}
        SET used = TRUE
        WHERE token = $1
        RETURNING *
      `;
      const result = await client.query(query, [token]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Token not found' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      logger.error('Error marking password reset token as used', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async cleanupExpiredTokens() {
    const client = await pool.connect();
    try {
      // Delete tokens that are expired and unused (older than 7 days)
      const query = `
        DELETE FROM ${TABLES.PASSWORD_RESET_TOKENS}
        WHERE expires_at < NOW() - INTERVAL '7 days' AND used = FALSE
      `;
      const result = await client.query(query);
      logger.info('Cleaned up expired password reset tokens', { count: result.rowCount });
      return { success: true, deletedCount: result.rowCount };
    } catch (error) {
      logger.error('Error cleaning up expired tokens', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection test successful', { time: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error: error.message });
    return false;
  }
};

module.exports = {
  pool,
  db,
  TABLES,
  ROLES,
  testConnection
};

