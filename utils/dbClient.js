/**
 * Unified database and storage client
 * This file exports both database and storage clients for backward compatibility
 * with the existing codebase that uses supabaseClient.js
 */

const { db, TABLES, ROLES, pool, testConnection } = require('./databaseClient');
const { storage, BUCKETS } = require('./storageClient');

// Export everything for backward compatibility
module.exports = {
  db,
  storage,
  TABLES,
  BUCKETS,
  ROLES,
  pool,
  testConnection
};

