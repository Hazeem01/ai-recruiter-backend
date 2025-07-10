require('dotenv').config();
const { createClient } = require("@supabase/supabase-js");
const logger = require('./logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase configuration', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey
  });
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create admin client for server-side operations
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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
  PRO_SIGNUPS: 'pro_signups'
};

// Storage bucket names
const BUCKETS = {
  RESUMES: 'resumes',
  FILES: 'files',
  AVATARS: 'avatars'
};

// User roles
const ROLES = {
  RECRUITER: 'recruiter',
  APPLICANT: 'applicant',
  ADMIN: 'admin'
};

// Database operations
const db = {
  // User operations
  async createUser(userData) {
    try {
      // Use the admin client to bypass RLS for user creation
      const { data, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .insert([userData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating user', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting user', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting user by email', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async updateUser(userId, updates) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error updating user', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async updateUserProfile(userData) {
    try {
      // Try to update existing user first, if not found, create new one
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .upsert([userData], { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error updating user profile', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Company operations
  async createCompany(companyData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMPANIES)
        .insert([companyData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating company', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getCompanyById(companyId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMPANIES)
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting company', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async updateCompany(companyId, updates) {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMPANIES)
        .update(updates)
        .eq('id', companyId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error updating company', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getCompanies(filters = {}) {
    try {
      let query = supabase.from(TABLES.COMPANIES).select('*');
      
      if (filters.industry) {
        query = query.eq('industry', filters.industry);
      }
      if (filters.size) {
        query = query.eq('size', filters.size);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting companies', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getCompanyUsers(companyId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting company users', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Job operations
  async createJob(jobData) {
    try {
      // Use the admin client to bypass RLS for job creation
      const { data, error } = await supabaseAdmin
        .from(TABLES.JOBS)
        .insert([jobData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating job', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getJobs(filters = {}) {
    try {
      // Use the admin client to bypass RLS for job queries
      let query = supabaseAdmin.from(TABLES.JOBS).select('*');
      
      if (filters.recruiter_id) {
        query = query.eq('recruiter_id', filters.recruiter_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting jobs', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async updateJob(jobId, updates) {
    try {
      // Use the admin client to bypass RLS for job updates
      const { data, error } = await supabaseAdmin
        .from(TABLES.JOBS)
        .update(updates)
        .eq('id', jobId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error updating job', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async deleteJob(jobId) {
    try {
      // Use the admin client to bypass RLS for job deletion
      const { error } = await supabaseAdmin
        .from(TABLES.JOBS)
        .delete()
        .eq('id', jobId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      logger.error('Error deleting job', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Candidate operations
  async createCandidate(candidateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from(TABLES.CANDIDATES)
        .insert([candidateData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating candidate', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getCandidates(filters = {}) {
    try {
      let query = supabaseAdmin
        .from(TABLES.CANDIDATES)
        .select(`
          *,
          jobs (
            id,
            title,
            company,
            location,
            job_type,
            salary_range,
            status
          )
        `);

      if (filters.recruiterId) {
        query = query.eq('jobs.recruiter_id', filters.recruiterId);
      }

      if (filters.jobId) {
        query = query.eq('job_id', filters.jobId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error getting candidates', { error: error.message });
        throw new Error(error.message);
      }

      return { success: true, data, count };
    } catch (error) {
      logger.error('Error getting candidates', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Resume operations
  async createResume(resumeData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.RESUMES)
        .insert([resumeData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating resume', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getResumeById(resumeId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.RESUMES)
        .select('*')
        .eq('id', resumeId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting resume', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Interview operations
  async createInterview(interviewData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.INTERVIEWS)
        .insert([interviewData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating interview', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getInterviews(filters = {}) {
    try {
      let query;
      
      if (filters.recruiter_id) {
        // Join with candidates and jobs to filter by recruiter_id
        query = supabase
          .from(TABLES.INTERVIEWS)
          .select('*, candidates!inner(*, jobs!inner(*))');
        query = query.eq('candidates.jobs.recruiter_id', filters.recruiter_id);
      } else {
        query = supabase.from(TABLES.INTERVIEWS).select('*');
      }
      
      if (filters.candidate_id) {
        query = query.eq('candidate_id', filters.candidate_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query.order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      
      // Flatten the result if we have joins
      const interviews = filters.recruiter_id ? 
        data.map(row => ({ ...row, candidate: row.candidates, job: row.candidates?.jobs })) : 
        data;
      
      return { success: true, data: interviews };
    } catch (error) {
      logger.error('Error getting interviews', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Chat operations
  async saveChatMessage(userId, message, response, context = 'general') {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from(TABLES.CHAT_HISTORY)
        .insert([{
          user_id: userId,
          message: message,
          response: response,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error saving chat message', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getChatHistory(userId, limit = 50) {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from(TABLES.CHAT_HISTORY)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Transform the data to match the expected format
      const transformedData = data.reverse().map(row => [
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
    }
  },

  // File operations
  async createFile(fileData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.FILES)
        .insert([fileData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating file record', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getFileById(fileId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.FILES)
        .select('*')
        .eq('id', fileId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting file', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getUserFiles(userId, filters = {}) {
    try {
      let query = supabase
        .from(TABLES.FILES)
        .select('*')
        .eq('user_id', userId);
      
      // Apply category filter if provided
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;
      
      // Get total count for pagination
      const countQuery = supabase
        .from(TABLES.FILES)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (filters.category) {
        countQuery.eq('category', filters.category);
      }
      
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      
      // Get paginated results
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      const totalPages = Math.ceil(count / limit);
      
      return { 
        success: true, 
        data: {
          files: data,
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
    }
  },

  async deleteFileById(fileId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.FILES)
        .delete()
        .eq('id', fileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error deleting file record', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Pro signup operations
  async createProSignup(signupData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PRO_SIGNUPS)
        .insert([signupData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating pro signup', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};

// Storage operations
const storage = {
  async uploadFile(bucketName, filePath, fileBuffer, options = {}) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, options);
      
      if (error) throw error;
      
      // Make the file public after upload
      const { error: updateError } = await supabase.storage
        .from(bucketName)
        .update(filePath, fileBuffer, {
          ...options,
          upsert: true
        });
      
      if (updateError) {
        logger.warn('Failed to make file public', { error: updateError.message });
      }
      
      return { success: true, data };
    } catch (error) {
      logger.error('Error uploading file', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getFileUrl(bucketName, filePath) {
    try {
      // First try to get public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      // Test if the public URL is accessible
      try {
        const response = await fetch(data.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          return { success: true, data: data.publicUrl };
        }
      } catch (fetchError) {
        logger.warn('Public URL not accessible, file may be private', { 
          error: fetchError.message,
          bucketName,
          filePath 
        });
      }
      
      // If public URL doesn't work, return null (we'll use direct download)
      return { success: true, data: null };
    } catch (error) {
      logger.error('Error getting file URL', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async deleteFile(bucketName, filePath) {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      logger.error('Error deleting file', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};

// Auth operations
const auth = {
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error signing up user', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error signing in user', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      logger.error('Error signing out user', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      return { success: true, data: user };
    } catch (error) {
      logger.error('Error getting current user', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  db,
  storage,
  auth,
  TABLES,
  BUCKETS,
  ROLES
};