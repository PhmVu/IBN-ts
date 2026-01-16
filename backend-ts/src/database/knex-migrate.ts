import { db, testConnection, closeConnection } from '@config/knex';
import logger from '@core/logger';

/**
 * Run all Knex migrations
 */
async function runMigrations() {
  try {
    logger.info('🚀 Starting database migrations...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Run migrations
    const [batchNo, migrations] = await db.migrate.latest();

    if (migrations.length === 0) {
      logger.info('✓ Database is already up to date');
    } else {
      logger.info(`✓ Batch ${batchNo} run: ${migrations.length} migrations`);
      migrations.forEach((migration: string) => {
        logger.info(`  - ${migration}`);
      });
    }

    logger.info('✅ All migrations completed successfully');
  } catch (error) {
    console.error('Full error:', error);
    logger.error('❌ Migration failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    await closeConnection();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigrations;
