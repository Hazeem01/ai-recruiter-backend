require('dotenv').config();
const { testConnection, db, pool } = require('../utils/databaseClient');
const logger = require('../utils/logger');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    // Test environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasDbParams = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD;
    
    if (!hasDbUrl && !hasDbParams) {
      console.log('❌ Missing database configuration!');
      console.log('   Please set either DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD in your .env file');
      process.exit(1);
    }
    
    console.log('✅ Database configuration found');
    
    // Test connection
    console.log('🔄 Attempting to connect to database...');
    const connected = await testConnection();
    
    if (!connected) {
      console.log('❌ Failed to connect to database');
      console.log('   Check your connection string and credentials');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful!\n');
    
    // Test database operations
    console.log('🔄 Testing database operations...');
    
    // Test a simple query
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Query test successful');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   PostgreSQL version:', result.rows[0].pg_version.split(',')[0]);
    
    // Check if tables exist
    console.log('\n🔄 Checking database tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found. You may need to run migrations.');
      console.log('   Run: npm run migrate');
    } else {
      console.log(`✅ Found ${tables.length} table(s):`);
      tables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }
    
    // Check required tables
    const requiredTables = ['users', 'companies', 'jobs', 'candidates', 'resumes', 'interviews', 'chat_history', 'files'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing required tables:', missingTables.join(', '));
      console.log('   Run migrations to create them: npm run migrate');
    } else {
      console.log('\n✅ All required tables exist!');
    }
    
    // Check for password_hash column
    console.log('\n🔄 Checking password_hash column...');
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    
    if (columnsResult.rows.length === 0) {
      console.log('⚠️  password_hash column not found in users table');
      console.log('   Run migration: migrations/005_add_password_hash.sql');
    } else {
      console.log('✅ password_hash column exists');
    }
    
    console.log('\n📋 Database Connection Summary:');
    console.log('   - Connection:', '✅ Working');
    console.log('   - Tables:', `${tables.length} found`);
    console.log('   - Required tables:', missingTables.length === 0 ? '✅ All present' : `⚠️  ${missingTables.length} missing`);
    console.log('   - Password hash:', columnsResult.rows.length > 0 ? '✅ Present' : '⚠️  Missing');
    
    console.log('\n✅ Database connection test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Database connection test failed:', error.message);
    console.error('\n📋 Troubleshooting:');
    console.error('   1. Check DATABASE_URL in .env file');
    console.error('   2. Verify database credentials are correct');
    console.error('   3. Ensure database allows connections from your IP');
    console.error('   4. Check SSL mode is set correctly (sslmode=require)');
    console.error('\n   Error details:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  testDatabaseConnection();
}

module.exports = testDatabaseConnection; 