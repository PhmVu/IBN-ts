import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '@config/knex';
import { JwtPayload } from '@core/types';
import logger from '@core/logger';
import RBACService from '@services/rbacService';

/**
 * JWT Service with RS256 and Automatic Key Rotation
 * 
 * Features:
 * - Asymmetric signing (RS256)
 * - Automatic monthly key rotation
 * - Old keys retained for 30 days
 * - Public key endpoint for external services
 */
export class JwtService {
  private currentKeyId: string | null = null;
  private privateKey: string | null = null;
  // private publicKey: string | null = null; // Not needed, loaded from DB
  private keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
  private keyRetentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Initialize JWT service
   * Loads current active key or generates new one
   */
  async initialize(): Promise<void> {
    try {
      // 1. Try loading from files first (Priority)
      const keyDir = path.join(process.cwd(), 'keys');
      const privateKeyPath = path.join(keyDir, 'jwt-private.pem');
      const publicKeyPath = path.join(keyDir, 'jwt-public.pem');

      if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
        logger.info('Loading JWT keys from files...');
        const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        const keyId = 'static-file-key';

        // Sync to DB so verifyToken can find it
        const existing = await db('jwt_keys').where({ key_id: keyId }).first();

        if (!existing) {
          await db('jwt_keys').insert({
            key_id: keyId,
            private_key: privateKey,
            public_key: publicKey,
            algorithm: 'RS256',
            is_active: true,
            created_at: new Date(),
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          });
        } else {
          // Update to ensure DB matches file content
          await db('jwt_keys').where({ key_id: keyId }).update({
            private_key: privateKey,
            public_key: publicKey,
            is_active: true
          });
        }

        this.currentKeyId = keyId;
        this.privateKey = privateKey;
        logger.info('JWT service initialized with file-based keys');

        // Clean up expired keys
        await this.cleanupExpiredKeys();
        return;
      }

      // 2. Fallback to DB/Rotation logic
      // Get active key from database
      const activeKey = await db('jwt_keys')
        .where({ is_active: true })
        .first();

      if (activeKey) {
        // Check if key needs rotation
        const keyAge = Date.now() - new Date(activeKey.created_at).getTime();

        if (keyAge > this.keyRotationInterval) {
          logger.info('JWT key expired, rotating...', {
            keyId: activeKey.key_id,
            age: Math.floor(keyAge / (24 * 60 * 60 * 1000)) + ' days'
          });
          await this.rotateKeys();
        } else {
          // Use existing key
          this.currentKeyId = activeKey.key_id;
          this.privateKey = activeKey.private_key;
          // Public key loaded from DB when needed

          logger.info('JWT service initialized with existing key', {
            keyId: this.currentKeyId,
            algorithm: activeKey.algorithm
          });
        }
      } else {
        // No active key, generate new one
        logger.info('No active JWT key found, generating new key...');
        await this.rotateKeys();
      }

      // Clean up expired keys
      await this.cleanupExpiredKeys();
    } catch (error: any) {
      logger.error('Failed to initialize JWT service', {
        error: error.message,
        stack: error.stack
      });
      throw new Error('JWT service initialization failed');
    }
  }

  /**
   * Generate new RSA key pair and rotate
   */
  private async rotateKeys(): Promise<void> {
    try {
      logger.info('Generating new RSA key pair...');

      // Generate RSA key pair (2048 bits)
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Generate key ID (format: key-YYYY-MM)
      const now = new Date();
      const keyId = `key-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Deactivate old keys
      await db('jwt_keys')
        .where({ is_active: true })
        .update({ is_active: false });

      // Insert new key
      await db('jwt_keys').insert({
        key_id: keyId,
        private_key: privateKey,
        public_key: publicKey,
        algorithm: 'RS256',
        is_active: true,
        created_at: new Date(),
        expires_at: new Date(Date.now() + this.keyRetentionPeriod)
      });

      // Update current key
      this.currentKeyId = keyId;
      this.privateKey = privateKey;
      // Public key stored in DB

      logger.info('JWT key rotated successfully', {
        keyId,
        algorithm: 'RS256'
      });
    } catch (error: any) {
      logger.error('Failed to rotate JWT keys', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up expired keys
   */
  private async cleanupExpiredKeys(): Promise<void> {
    try {
      const deleted = await db('jwt_keys')
        .where('expires_at', '<', new Date())
        .delete();

      if (deleted > 0) {
        logger.info('Cleaned up expired JWT keys', { count: deleted });
      }
    } catch (error: any) {
      logger.error('Failed to cleanup expired keys', {
        error: error.message
      });
    }
  }

  /**
   * Generate JWT token
   */
  async generateToken(
    userId: string,
    username: string,
    email: string,
    organizationId?: string,
    walletId?: string
  ): Promise<string> {
    if (!this.privateKey || !this.currentKeyId) {
      throw new Error('JWT service not initialized');
    }

    try {
      // Load user roles from database
      let roles = undefined;
      try {
        const userRoles = await RBACService.getUserRoles(userId);
        roles = userRoles.map((r) => ({
          id: r.id,
          name: r.name,
        }));
      } catch (error) {
        logger.warn('Failed to load roles for JWT', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      const payload: JwtPayload = {
        id: userId,
        sub: userId,
        username,
        email,
        role: 'user', // Default role
        is_superuser: false, // Default
        organization_id: organizationId,
        wallet_id: walletId,
        roles,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      };

      // Sign with RS256
      const token = jwt.sign(payload, this.privateKey, {
        algorithm: 'RS256',
        keyid: this.currentKeyId
      });

      logger.debug('JWT token generated', {
        userId,
        keyId: this.currentKeyId
      });

      return token;
    } catch (error: any) {
      logger.error('Failed to generate JWT token', {
        userId,
        error: error.message
      });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      // Decode header to get key ID
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded || !decoded.header.kid) {
        throw new Error('Invalid token format');
      }

      const keyId = decoded.header.kid;

      // Get public key from database
      const keyRecord = await db('jwt_keys')
        .where({ key_id: keyId })
        .first();

      if (!keyRecord) {
        throw new Error('Signing key not found');
      }

      // Verify token
      const payload = jwt.verify(token, keyRecord.public_key, {
        algorithms: ['RS256']
      }) as JwtPayload;

      return payload;
    } catch (error: any) {
      logger.error('Token verification failed', {
        error: error.message
      });

      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }

      throw new Error('Token verification failed');
    }
  }

  /**
   * Get all public keys (for external services)
   */
  async getPublicKeys(): Promise<Array<{
    keyId: string;
    publicKey: string;
    algorithm: string;
    isActive: boolean;
  }>> {
    try {
      const keys = await db('jwt_keys')
        .select('key_id', 'public_key', 'algorithm', 'is_active')
        .orderBy('created_at', 'desc');

      return keys.map(k => ({
        keyId: k.key_id,
        publicKey: k.public_key,
        algorithm: k.algorithm,
        isActive: k.is_active
      }));
    } catch (error: any) {
      logger.error('Failed to get public keys', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate refresh token (simple, no rotation)
   */
  generateRefreshToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    };

    // Use symmetric key for refresh tokens (simpler)
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me';
    return jwt.sign(payload, refreshSecret);
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): { sub: string } {
    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me';
      const payload = jwt.verify(token, refreshSecret) as { sub: string; type: string };

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return { sub: payload.sub };
    } catch (error: any) {
      logger.error('Refresh token verification failed', {
        error: error.message
      });
      throw new Error('Invalid refresh token');
    }
  }
}

// Singleton instance
export const jwtService = new JwtService();
