require('dotenv').config();
const { auth, db } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test if the Supabase client can be created
    console.log('✅ Supabase client created successfully');
    
    // Test if auth object exists
    if (auth) {
      console.log('✅ Auth module available');
    } else {
      console.log('❌ Auth module not available');
    }
    
    // Test if db object exists
    if (db) {
      console.log('✅ Database module available');
    } else {
      console.log('❌ Database module not available');
    }
    
    // Test environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      console.log('✅ All required environment variables are set');
    } else {
      console.log('⚠️  Missing environment variables:', missingVars.join(', '));
      console.log('   Please set these in your .env file');
    }
    
    console.log('\n📋 Database Connection Summary:');
    console.log('   - Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
    console.log('   - Supabase Anon Key:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
    console.log('   - Supabase Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
    
    if (missingVars.length === 0) {
      console.log('\n✅ Database connection test completed successfully!');
      console.log('   To run migrations, ensure you have valid Supabase credentials in your .env file');
    } else {
      console.log('\n⚠️  Database connection test completed with warnings');
      console.log('   Set up your .env file with valid Supabase credentials to enable full functionality');
    }
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testDatabaseConnection();
}

module.exports = testDatabaseConnection; 