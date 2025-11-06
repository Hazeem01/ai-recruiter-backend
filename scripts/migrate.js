require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../utils/databaseClient');
const logger = require('../utils/logger');

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, '../migrations');
    this.migrations = [];
  }

  async loadMigrations() {
    try {
      const files = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const migrationPath = path.join(this.migrationsDir, file);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        this.migrations.push({
          name: file,
          sql: sql
        });
      }

      logger.info(`Loaded ${this.migrations.length} migrations`);
      return this.migrations;
    } catch (error) {
      logger.error('Error loading migrations:', error);
      throw error;
    }
  }

  async createMigrationsTable() {
    const client = await pool.connect();
    try {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      logger.info('Migrations table ready');
    } catch (error) {
      logger.error('Error creating migrations table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getExecutedMigrations() {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT name FROM migrations ORDER BY executed_at');
      return result.rows.map(row => row.name);
    } catch (error) {
      logger.error('Error getting executed migrations:', error);
      return [];
    } finally {
      client.release();
    }
  }

  async runMigration(migration) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute the entire SQL file as one block
      // PostgreSQL can handle multiple statements in a single query
      await client.query(migration.sql);

      // Record migration
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [migration.name]
      );

      await client.query('COMMIT');
      logger.info(`✅ Migration ${migration.name} executed successfully`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`❌ Error running migration ${migration.name}:`, error.message);
      logger.error(`   Error details:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations() {
    try {
      logger.info('Starting database migrations...');

      // Create migrations table
      await this.createMigrationsTable();

      // Load migrations
      await this.loadMigrations();

      // Get already executed migrations
      const executed = await this.getExecutedMigrations();
      logger.info(`Found ${executed.length} already executed migrations`);

      // Filter out already executed migrations
      const pendingMigrations = this.migrations.filter(
        m => !executed.includes(m.name)
      );

      if (pendingMigrations.length === 0) {
        logger.info('✅ No pending migrations. Database is up to date!');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migration(s)`);

      // Run pending migrations
      for (const migration of pendingMigrations) {
        logger.info(`Running migration: ${migration.name}`);
        await this.runMigration(migration);
      }

      logger.info('✅ All migrations completed successfully!');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  async reset() {
    try {
      logger.warn('⚠️  Resetting database - this will drop all tables!');
      
      const client = await pool.connect();
      try {
        // Get all tables
        const tablesResult = await client.query(`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
        `);

        const tables = tablesResult.rows.map(row => row.tablename);

        // Drop all tables (including migrations)
        for (const table of tables) {
          await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
          logger.info(`Dropped table: ${table}`);
        }

        logger.info('✅ Database reset completed');
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error resetting database:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new MigrationRunner();

  try {
    if (args.includes('--reset')) {
      await runner.reset();
    }

    await runner.runMigrations();
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
