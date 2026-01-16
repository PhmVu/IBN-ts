import { db, testConnection, closeConnection } from '@config/knex';
import logger from '@core/logger';
import fs from 'fs';
import path from 'path';

console.log('[seed-runner] start');

/**
 * Run all Knex seeds
 */
async function runSeeds(keepConnection = false) {
  try {
    logger.info('🌱 Starting database seeding...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Manually load and run seeds in order to support TypeScript
    const seedsDir = path.join(__dirname, 'knex-seeds');
    const files = fs
      .readdirSync(seedsDir)
      .filter((f) => f.endsWith('.ts'))
      .sort();

    if (files.length === 0) {
      logger.info('✓ No seeds to run');
    } else {
      logger.info(`🌱 Executing ${files.length} seed files...`);
      logger.info(`Files: ${files.join(', ')}`);
      for (const file of files) {
        const fullPath = path.join(seedsDir, file);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        try {
          console.log(`[seed-runner] loading ${file}`);
          const mod = require(fullPath);
          console.log(`[seed-runner] loaded ${file}`);
          const fn = mod.seed || mod.default;
          if (typeof fn === 'function') {
            logger.info(`→ Running seed: ${file}`);
            await fn(db);
            logger.info(`✓ Completed seed: ${file}`);
          } else {
            logger.warn(`Skipping ${file}: no seed() export found`);
          }
        } catch (error) {
          logger.error(`❌ Seed failed: ${file}`, { error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      }
      logger.info('✅ All seeds completed successfully');
    }
  } catch (error) {
    logger.error('❌ Seeding failed:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    if (!keepConnection) {
      await closeConnection();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runSeeds;
