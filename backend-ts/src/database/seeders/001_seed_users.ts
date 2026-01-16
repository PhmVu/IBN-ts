import { query } from '@config/database';
import bcrypt from 'bcryptjs';
import logger from '@core/logger';

export async function seedUsers() {
  try {
    // Check if users already exist
    const result = await query('SELECT COUNT(*) as count FROM users');
    if (result.rows[0].count > 0) {
      logger.info('Users already seeded, skipping...');
      return;
    }

    // Create test users
    const testPassword = await bcrypt.hash('password123', 10);
    
    await query(`
      INSERT INTO users (username, email, password_hash, role, is_active)
      VALUES 
        ('admin', 'admin@ictu.edu.vn', $1, 'admin', true),
        ('user1', 'user1@ictu.edu.vn', $1, 'user', true),
        ('user2', 'user2@ictu.edu.vn', $1, 'user', true)
    `, [testPassword]);

    logger.info('✅ Users seeded successfully');
    logger.info('Test accounts:');
    logger.info('  - admin@ictu.edu.vn / password123 (admin)');
    logger.info('  - user1@ictu.edu.vn / password123 (user)');
    logger.info('  - user2@ictu.edu.vn / password123 (user)');
  } catch (error) {
    logger.error('Failed to seed users:', error);
    throw error;
  }
}
