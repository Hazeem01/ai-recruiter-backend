require('dotenv').config();
const { supabaseAdmin } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

async function syncExistingUsers() {
  try {
    console.log('🔄 Starting user sync process...');

    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to get auth users: ${authError.message}`);
    }

    console.log(`📊 Found ${authUsers.users.length} users in Supabase Auth`);

    // Get existing users in the users table
    const { data: existingUsers, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, email');

    if (dbError) {
      throw new Error(`Failed to get existing users: ${dbError.message}`);
    }

    console.log(`📊 Found ${existingUsers.length} users in users table`);

    const existingUserIds = new Set(existingUsers.map(u => u.id));
    const usersToCreate = [];

    // Find users that exist in auth but not in users table
    for (const authUser of authUsers.users) {
      if (!existingUserIds.has(authUser.id)) {
        usersToCreate.push({
          id: authUser.id,
          email: authUser.email,
          first_name: authUser.user_metadata?.first_name || '',
          last_name: authUser.user_metadata?.last_name || '',
          role: authUser.user_metadata?.role || 'applicant',
          created_at: authUser.created_at,
          updated_at: authUser.updated_at
        });
      }
    }

    console.log(`🆕 Found ${usersToCreate.length} users to sync`);

    if (usersToCreate.length > 0) {
      // Insert missing users
      const { data: insertedUsers, error: insertError } = await supabaseAdmin
        .from('users')
        .insert(usersToCreate)
        .select();

      if (insertError) {
        throw new Error(`Failed to insert users: ${insertError.message}`);
      }

      console.log(`✅ Successfully synced ${insertedUsers.length} users`);
      
      // Log the synced users
      insertedUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    } else {
      console.log('✅ All users are already synced');
    }

    console.log('🎉 User sync completed successfully!');

  } catch (error) {
    console.error('❌ Error syncing users:', error.message);
    logger.error('User sync failed', { error: error.message });
    process.exit(1);
  }
}

// Run the sync if this script is executed directly
if (require.main === module) {
  syncExistingUsers();
}

module.exports = { syncExistingUsers }; 