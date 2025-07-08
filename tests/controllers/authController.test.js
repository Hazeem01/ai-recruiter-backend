const authController = require('../../controllers/authController');

// Mock the entire supabaseClient module
jest.mock('../../utils/supabaseClient', () => ({
  auth: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn()
  },
  db: {
    createUser: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    createCompany: jest.fn(),
    getCompanies: jest.fn()
  }
}));

describe('Auth Controller', () => {
  let req, res, next;
  const { auth, db } = require('../../utils/supabaseClient');

  beforeEach(() => {
    req = testUtils.createMockRequest();
    res = testUtils.createMockResponse();
    next = testUtils.createMockNext();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      req.body = userData;

      // Mock successful signup
      auth.signUp.mockResolvedValue({
        success: true,
        data: { user: { id: 'user123', email: userData.email } }
      });

      // Mock successful user creation
      db.createUser.mockResolvedValue({
        success: true,
        data: { id: 'user123', email: userData.email }
      });

      // Mock user not exists
      db.getUserById.mockResolvedValue({
        success: true,
        data: null
      });

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: 'user123',
            email: userData.email
          }),
          token: expect.any(String)
        })
      });
    });

    it('should register a recruiter with company successfully', async () => {
      const userData = {
        email: 'recruiter@company.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'recruiter',
        company: {
          name: 'Tech Corp',
          description: 'A technology company',
          website: 'https://techcorp.com',
          industry: 'Technology',
          size: 'medium',
          location: 'San Francisco, CA',
          foundedYear: 2020
        }
      };

      req.body = userData;

      // Mock successful signup
      auth.signUp.mockResolvedValue({
        success: true,
        data: { user: { id: 'user456', email: userData.email } }
      });

      // Mock company not exists
      db.getCompanies.mockResolvedValue({
        success: true,
        data: []
      });

      // Mock successful company creation
      db.createCompany.mockResolvedValue({
        success: true,
        data: { id: 'company123', name: 'Tech Corp' }
      });

      // Mock successful user creation
      db.createUser.mockResolvedValue({
        success: true,
        data: { id: 'user456', email: userData.email, company_id: 'company123' }
      });

      // Mock user not exists
      db.getUserById.mockResolvedValue({
        success: true,
        data: null
      });

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: 'user456',
            email: userData.email,
            role: 'recruiter',
            companyId: 'company123'
          }),
          token: expect.any(String)
        })
      });
    });

    it('should handle registration errors', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      req.body = userData;

      // Mock signup error
      auth.signUp.mockResolvedValue({
        success: false,
        error: 'User already exists'
      });

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User already exists'
        })
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      req.body = loginData;

      // Mock successful login
      auth.signIn.mockResolvedValue({
        success: true,
        data: { user: { id: 'user123', email: loginData.email } }
      });

      // Mock successful user retrieval
      db.getUserById.mockResolvedValue({
        success: true,
        data: {
          id: 'user123',
          email: loginData.email,
          first_name: 'John',
          last_name: 'Doe',
          role: 'applicant'
        }
      });

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: 'user123',
            email: loginData.email
          }),
          token: expect.any(String)
        })
      });
    });
  });
}); 