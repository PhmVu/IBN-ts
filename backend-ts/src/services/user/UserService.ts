import { query } from '@config/database';
import { DatabaseError, NotFoundError } from '@core/errors';
import { PasswordService } from '@services/auth/PasswordService';
import logger from '@core/logger';

export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'auditor';
}

export interface UserUpdateInput {
  username?: string;
  email?: string;
  role?: 'admin' | 'user' | 'auditor';
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  org_id: string | null;
  is_active: boolean;
  is_enrolled: boolean;
  fabric_identity_id: string | null;
  enrolled_at: string | null;
  created_at: string;
  updated_at: string;
}

export class UserService {
  static async getUserById(userId: string): Promise<UserResponse> {
    try {
      const result = await query(
        'SELECT id, username, email, role, organization_id as org_id, is_active, is_enrolled, fabric_identity_id, enrolled_at, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get user error', { userId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to retrieve user');
    }
  }

  static async getAllUsers(limit: number = 100, offset: number = 0): Promise<{
    users: UserResponse[];
    total: number;
  }> {
    try {
      const resultCount = await query('SELECT COUNT(*) as count FROM users');
      const total = resultCount.rows[0].count;

      const result = await query(
        'SELECT id, username, email, role, organization_id as org_id, is_active, is_enrolled, fabric_identity_id, enrolled_at, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      return {
        users: result.rows,
        total,
      };
    } catch (error) {
      logger.error('Get all users error', { error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to retrieve users');
    }
  }

  static async createUser(input: UserCreateInput): Promise<UserResponse> {
    try {
      logger.info(`Creating user: ${input.username}`);

      const passwordHash = await PasswordService.hashPassword(input.password);

      const result = await query(
        'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) ' +
        'VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) ' +
        'RETURNING id, username, email, role, org_id, is_active, created_at, updated_at',
        [input.username, input.email, passwordHash, input.role, true]
      );

      const user = result.rows[0];
      logger.info(`User created successfully: ${input.username}`);

      // Auto-enroll to blockchain (non-blocking)
      try {
        logger.info(`Auto-enrolling user to blockchain: ${input.username}`);

        // Get user's organization
        const orgResult = await query(
          'SELECT msp_id FROM organizations WHERE id = $1',
          [user.org_id || '1'] // Default to org 1 if not specified
        );

        if (orgResult.rows.length > 0 && orgResult.rows[0].msp_id) {
          const mspId = orgResult.rows[0].msp_id;
          const { fabricCAService } = await import('@services/fabric');

          // Ensure admin is enrolled before registering user
          await fabricCAService.ensureAdminEnrolled(mspId);

          // Step 1: Register user with CA
          const enrollmentSecret = await fabricCAService.registerUser(
            input.username,
            mspId,
            'client'
          );

          // Step 2: Enroll user (get certificate)
          const certSerial = await fabricCAService.enrollUser(
            input.username,
            enrollmentSecret,
            mspId
          );

          // Step 3: Update user record
          await query(
            'UPDATE users SET is_enrolled = $1, fabric_identity_id = $2, enrolled_at = NOW() WHERE id = $3',
            [true, input.username, user.id]
          );

          logger.info(`User auto-enrolled successfully`, {
            username: input.username,
            mspId,
            certSerial
          });

          // Return updated user
          const updatedUser = await query(
            'SELECT id, username, email, role, org_id, is_active, is_enrolled, fabric_identity_id, enrolled_at, created_at, updated_at FROM users WHERE id = $1',
            [user.id]
          );
          return updatedUser.rows[0];
        } else {
          logger.warn(`Organization has no MSP ID, skipping auto-enrollment`, {
            username: input.username,
            orgId: user.org_id
          });
        }
      } catch (enrollError) {
        // Don't fail user creation if enrollment fails
        logger.warn(`Auto-enrollment failed, user can enroll manually later`, {
          username: input.username,
          error: enrollError instanceof Error ? enrollError.message : String(enrollError)
        });
      }

      return user;
    } catch (error) {
      logger.error('Create user error', { username: input.username, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to create user');
    }
  }

  static async updateUser(userId: string, input: UserUpdateInput): Promise<UserResponse> {
    try {
      logger.info(`Updating user: ${userId}`);

      // Build update query
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];
      let paramIndex = 1;

      if (input.username !== undefined) {
        updateFields.push(`username = $${paramIndex++}`);
        updateValues.push(input.username);
      }

      if (input.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(input.email);
      }

      if (input.role !== undefined) {
        updateFields.push(`role = $${paramIndex++}`);
        updateValues.push(input.role);
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(userId);

      if (updateFields.length === 1) {
        // Only updated_at, no changes
        return await this.getUserById(userId);
      }

      const result = await query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, role, org_id, is_active, created_at, updated_at`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      logger.info(`User updated successfully: ${userId}`);

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Update user error', { userId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to update user');
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      logger.info(`Deleting user: ${userId}`);

      const result = await query('DELETE FROM users WHERE id = $1', [userId]);

      if (result.rowCount === 0) {
        throw new NotFoundError('User not found');
      }

      logger.info(`User deleted successfully: ${userId}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Delete user error', { userId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to delete user');
    }
  }
}
