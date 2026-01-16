import { runMigrations } from './migrations/001_init';
import enhancedMigrations from './migrations/002_enhanced_schema';
import logger from '@core/logger';

async function runEnhancedMigrations() {
  logger.info('Running enhanced schema migrations...');
  
  for (const migration of enhancedMigrations) {
    try {
      logger.info(`Running migration: ${migration.name}`);
      await migration.up();
      logger.info(`✓ Migration completed: ${migration.name}`);
    } catch (error) {
      logger.error(`✗ Migration failed: ${migration.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  
  logger.info('All enhanced migrations completed successfully');
}

async function main() {
  try {
    await runMigrations();
    await runEnhancedMigrations();
    logger.info('Migrations finished');
    process.exit(0);
  } catch (error) {
    logger.error('Migration process failed', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

main();
