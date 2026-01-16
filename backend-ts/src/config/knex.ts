import knex, { Knex } from 'knex';
import path from 'path';
import logger from '@core/logger';
import * as dotenv from 'dotenv';

// Load environment variables from root .env before reading process.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Build knex configuration directly from environment variables to avoid import issues
// const environment = process.env.NODE_ENV || 'development';
const DB_HOST = (process.env.DB_HOST || 'localhost').trim();
const DB_PORT = parseInt((process.env.DB_PORT || '5432').trim());
const DB_NAME = (process.env.DB_NAME || 'ibn_db').trim();
const DB_USER = (process.env.DB_USER || 'postgres').trim();
const DB_PASSWORD = (process.env.DB_PASSWORD || 'postgres').trim();

const migrationsDir = path.join(__dirname, '../database/knex-migrations');
const seedsDir = path.join(__dirname, '../database/knex-seeds');

const config: Knex.Config = {
  client: 'postgresql',
  connection: {
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  },
  pool: {
    min: 1,
    max: 5,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: migrationsDir,
    extension: 'ts',
  },
  seeds: {
    directory: seedsDir,
    extension: 'ts',
  },
};

// Create Knex instance
export const db: Knex = knex(config);

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    logger.info('✓ Database connection successful');
    return true;
  } catch (error) {
    logger.error('✗ Database connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// Close database connection
export async function closeConnection(): Promise<void> {
  try {
    await db.destroy();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export default db;
