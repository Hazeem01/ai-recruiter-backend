require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const dotenv = require("dotenv");

dotenv.config();

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
    } catch (error) {
      logger.error('Error loading migrations:', error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      logger.info('Starting database migrations...');

      for (const migration of this.migrations) {
        logger.info(`Running migration: ${migration.name}`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: migration.sql
        });

        if (error) {
          logger.error(`Migration failed: ${migration.name}`, error);
          throw new Error(`Migration ${migration.name} failed: ${error.message}`);
        }

        logger.info(`Migration completed: ${migration.name}`);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration runner failed:', error);
      throw error;
    }
  }

  async createMigrationsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: createTableSQL
      });

      if (error) {
        logger.error('Failed to create migrations table:', error);
        throw error;
      }

      logger.info('Migrations table created/verified');
    } catch (error) {
      logger.error('Error creating migrations table:', error);
      throw error;
    }
  }
}

async function main() {
  const runner = new MigrationRunner();
  
  try {
    await runner.loadMigrations();
    await runner.createMigrationsTable();
    await runner.runMigrations();
    
    logger.info('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationRunner; 