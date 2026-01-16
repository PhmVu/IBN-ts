import { query } from '@config/database';
import logger from '@core/logger';
import { PasswordService } from '@services/auth';

async function seed() {
  try {
    logger.info('Seeding database...');

    // Check existing users
    const existingUsers = await query('SELECT COUNT(*) as count FROM users');
    if (existingUsers.rows[0].count > 0) {
      logger.info('Users already exist, skipping seeding.');
      process.exit(0);
      return;
    }

    // Create test users with password: password123
    const passwordHash = await PasswordService.hashPassword('password123');
    
    await query(
      'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      ['admin', 'admin@ictu.edu.vn', passwordHash, 'admin', true]
    );
    
    await query(
      'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      ['user1', 'user1@ictu.edu.vn', passwordHash, 'user', true]
    );
    
    await query(
      'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      ['user2', 'user2@ictu.edu.vn', passwordHash, 'user', true]
    );

    logger.info('✅ Seeding completed successfully!');
    logger.info('Test accounts (password: password123):');
    logger.info('  - admin@ictu.edu.vn (admin role)');
    logger.info('  - user1@ictu.edu.vn (user role)');
    logger.info('  - user2@ictu.edu.vn (user role)');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

seed();
