// Test setup file
require('dotenv').config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';

// Global test utilities
global.testUtils = {
  // Helper to create mock request objects
  createMockRequest: (body = {}, params = {}, query = {}) => ({
    body,
    params,
    query,
    headers: {},
    get: jest.fn(),
    ip: '127.0.0.1'
  }),

  // Helper to create mock response objects
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  },

  // Helper to create mock next function
  createMockNext: () => jest.fn()
}; 