import { query } from '@config/database';
import { DatabaseError, AuthenticationError, ValidationError } from '@core/errors';
import { PasswordService } from './PasswordService';
import { jwtService } from './JwtService';
import { bruteForceProtection } from '@services/security';
import logger from '@core/logger';

export interface LoginResult {
  userId: string;
  username: string;
  email: string;
  role: string;
  enrolled: boolean;
  walletId: string | null;
  certificateSerial: string | null;
  token: string;
  refreshToken: string;
}

export class AuthService {
  static async login(username: string, password: string, ipAddress?: string): Promise<LoginResult> {
    const ip = ipAddress || 'unknown';

    try {
      logger.info(`Login attempt for user: ${username} from IP: ${ip}`);

      // Check if account is locked due to brute-force attempts
      const isLocked = await bruteForceProtection.isLocked(username, ip);
      if (isLocked) {
        const remainingTime = await bruteForceProtection.getRemainingLockTime(username, ip);
        const minutes = Math.ceil(remainingTime / 60);

        logger.warn(`Login blocked: account locked - ${username} from ${ip}`);
        throw new AuthenticationError(
          `Account temporarily locked due to multiple failed login attempts. Try again in ${minutes} minute(s).`
        );
      }

      // Find user by username
      const result = await query(
        'SELECT id, username, email, password_hash, role, organization_id, enrolled, wallet_id, certificate_serial FROM users WHERE username = $1 AND is_active = true',
        [username]
      );

      if (result.rows.length === 0) {
        logger.warn(`Login failed: user not found - ${username}`);

        // Record failed attempt with explicit error handling
        try {
          logger.info(`Recording failed attempt for ${username} from ${ip}`);
          await bruteForceProtection.recordFailedAttempt(username, ip);
          logger.info(`Failed attempt recorded successfully`);
        } catch (bfError: any) {
          logger.error(`Failed to record brute-force attempt: ${bfError.message}`);
        }

        throw new AuthenticationError('Invalid username or password');
      }

      const user = result.rows[0];

      // Verify password
      const isPasswordValid = await PasswordService.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        logger.warn(`Login failed: invalid password - ${username}`);

        // Record failed attempt with explicit error handling
        try {
          logger.info(`Recording failed attempt for ${username} from ${ip}`);
          await bruteForceProtection.recordFailedAttempt(username, ip);
          logger.info(`Failed attempt recorded successfully`);

          // Get remaining attempts
          const attemptCount = await bruteForceProtection.getAttemptCount(username, ip);
          const remaining = 5 - attemptCount;
          logger.info(`Attempt count: ${attemptCount}, Remaining: ${remaining}`);

          if (remaining > 0) {
            throw new AuthenticationError(
              `Invalid username or password. ${remaining} attempt(s) remaining before account lock.`
            );
          } else {
            throw new AuthenticationError(
              'Account has been temporarily locked due to multiple failed login attempts.'
            );
          }
        } catch (bfError: any) {
          // If brute-force fails, still throw auth error
          logger.error(`Brute-force protection error: ${bfError.message}`);
          throw new AuthenticationError('Invalid username or password');
        }
      }

      // Clear failed attempts on successful login
      await bruteForceProtection.clearAttempts(username, ip);

      // Generate tokens
      const token = await jwtService.generateToken(
        user.id,
        user.username,
        user.email,
        user.organization_id
      );
      const refreshToken = jwtService.generateRefreshToken(user.id);

      logger.info(`Login successful for user: ${username}`);

      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        enrolled: user.enrolled || false,
        walletId: user.wallet_id || null,
        certificateSerial: user.certificate_serial || null,
        token,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Login error', { error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Database error during login');
    }
  }

  static async refreshToken(refreshToken: string): Promise<{ token: string }> {
    try {
      const payload = jwtService.verifyRefreshToken(refreshToken);

      // Get user info
      const result = await query('SELECT username, email, role, organization_id FROM users WHERE id = $1', [payload.sub]);

      if (result.rows.length === 0) {
        throw new AuthenticationError('User not found');
      }

      const user = result.rows[0];
      const newToken = await jwtService.generateToken(
        payload.sub,
        user.username,
        user.email,
        user.organization_id
      );

      return { token: newToken };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Refresh token error', { error: error instanceof Error ? error.message : String(error) });
      throw new AuthenticationError('Failed to refresh token');
    }
  }

  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      logger.info(`Change password for user: ${userId}`);

      // Validate new password strength
      const passwordStrength = PasswordService.validatePasswordStrength(newPassword);
      if (!passwordStrength.isValid) {
        throw new ValidationError('New password does not meet requirements', {
          errors: passwordStrength.errors,
        });
      }

      // Get user
      const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);

      if (result.rows.length === 0) {
        throw new AuthenticationError('User not found');
      }

      // Verify old password
      const isPasswordValid = await PasswordService.comparePassword(
        oldPassword,
        result.rows[0].password_hash
      );
      if (!isPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await PasswordService.hashPassword(newPassword);

      // Update password
      await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        newPasswordHash,
        userId,
      ]);

      logger.info(`Password changed successfully for user: ${userId}`);
    } catch (error) {
      if (error instanceof (AuthenticationError || ValidationError)) {
        throw error;
      }
      logger.error('Change password error', { error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Database error during password change');
    }
  }

  /**
   * Register new user with Fabric CA enrollment
   * Flow: Create user → Register with CA → Enroll → Store in wallet
   */
  static async register(username: string, email: string, password: string): Promise<{
    userId: string;
    username: string;
    email: string;
    enrolled: boolean;
    walletId: string;
  }> {
    try {
      logger.info(`Starting registration for user: ${username}`);

      // 1. Get default organization (first one available)
      const orgResult = await query(
        'SELECT id FROM organizations ORDER BY created_at LIMIT 1'
      );

      if (orgResult.rows.length === 0) {
        throw new DatabaseError('Default organization not found. Please run database migrations.');
      }

      const organizationId = orgResult.rows[0].id;

      // 2. Create user in database with organization
      const passwordHash = await PasswordService.hashPassword(password);
      const userResult = await query(
        'INSERT INTO users (username, email, password_hash, role, organization_id, is_active, enrolled, created_at, updated_at) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) ' +
        'RETURNING id, username, email',
        [username, email, passwordHash, 'user', organizationId, true, false]
      );

      const user = userResult.rows[0];
      logger.info(`User created in database: ${username} (${user.id}) with organization: ${organizationId}`);

      // 3. Get organization's MSP ID
      const orgMspResult = await query(
        'SELECT msp_id FROM organizations WHERE id = $1',
        [organizationId]
      );
      const mspId = orgMspResult.rows[0].msp_id;

      // 4. Ensure admin is enrolled (auto-enroll if needed)
      const { fabricCAService } = await import('@services/fabric');
      await fabricCAService.ensureAdminEnrolled(mspId);
      logger.info(`Admin enrollment verified for MSP: ${mspId}`);

      // 5. Register with Fabric CA
      const enrollmentSecret = await fabricCAService.registerUser(username, mspId, 'client');
      logger.info(`User registered with Fabric CA: ${username}`);

      // 5. Enroll user (get certificate + private key)
      const certificateSerial = await fabricCAService.enrollUser(username, enrollmentSecret, mspId);
      logger.info(`User enrolled with Fabric CA: ${username}, cert serial: ${certificateSerial}`);

      // 6. Wallet ID is created automatically by enrollUser and stored in wallets table
      const walletId = `${username}@${mspId}`;
      logger.info(`Identity stored in wallet: ${walletId}`);

      // 7. Update user record with wallet info
      await query(
        'UPDATE users SET wallet_id = $1, certificate_serial = $2, enrolled = $3, enrolled_at = NOW() WHERE id = $4',
        [walletId, certificateSerial, true, user.id]
      );
      logger.info(`User record updated with wallet info: ${username}`);

      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        enrolled: true,
        walletId: walletId
      };
    } catch (error) {
      logger.error('Registration error', {
        username,
        error: error instanceof Error ? error.message : String(error)
      });

      // Rollback: delete user if created
      try {
        await query('DELETE FROM users WHERE username = $1', [username]);
      } catch (rollbackError) {
        logger.error('Rollback failed', { username, rollbackError });
      }

      throw new DatabaseError('Failed to register user: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}
