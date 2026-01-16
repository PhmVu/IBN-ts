import { db, testConnection, closeConnection } from '@config/knex';
import logger from '@core/logger';

/**
 * Rollback last migration batch
 */
async function rollbackMigrations() {
  try {
    logger.info('↩️  Starting migration rollback...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Rollback
    const [batchNo, migrations] = await db.migrate.rollback();

    if (migrations.length === 0) {
      logger.info('✓ No migrations to rollback');
    } else {
      logger.info(`✓ Batch ${batchNo} rolled back: ${migrations.length} migrations`);
      migrations.forEach((migration: string) => {
        logger.info(`  - ${migration}`);
      });
    }

    logger.info('✅ Rollback completed successfully');
  } catch (error) {
    logger.error('❌ Rollback failed:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await closeConnection();
  }
}

// Run if called directly
if (require.main === module) {
  rollbackMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default rollbackMigrations;
