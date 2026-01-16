import fs from 'fs';
import path from 'path';
import logger from '@core/logger';

/**
 * CertificateService - Manages Fabric certificates
 * Loads certificates from network crypto-config directory
 */
export class CertificateService {
  private static cryptoConfigPath: string;
  private static mspId: string = 'IBNMSP';
  private static orgDomain: string = 'ibn.ictu.edu.vn';

  /**
   * Initialize certificate service
   */
  static initialize(cryptoConfigPath?: string, mspId?: string, orgDomain?: string): void {
    // Try multiple possible paths
    const possiblePaths = [
      cryptoConfigPath,
      path.join(process.cwd(), '..', 'network', 'crypto-config'),
      path.join(process.cwd(), 'network', 'crypto-config'),
      path.join(__dirname, '..', '..', '..', 'network', 'crypto-config'),
    ].filter(Boolean) as string[];

    // Find first existing path
    let foundPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        foundPath = possiblePath;
        break;
      }
    }

    this.cryptoConfigPath = foundPath || possiblePaths[0];
    this.mspId = mspId || 'IBNMSP';
    this.orgDomain = orgDomain || 'ibn.ictu.edu.vn';

    if (!foundPath) {
      logger.warn('CertificateService: crypto-config path not found, using default', {
        attemptedPaths: possiblePaths,
        usingPath: this.cryptoConfigPath,
      });
    } else {
      logger.info('CertificateService initialized', {
        cryptoConfigPath: this.cryptoConfigPath,
        mspId: this.mspId,
        orgDomain: this.orgDomain,
      });
    }
  }

  /**
   * Get Admin certificate and private key
   */
  static getAdminCredentials(): { certificate: string; privateKey: string; mspId: string } | null {
    try {
      const adminPath = path.join(
        this.cryptoConfigPath,
        'peerOrganizations',
        this.orgDomain,
        'users',
        `Admin@${this.orgDomain}`,
        'msp'
      );

      // Read certificate
      const certPath = path.join(adminPath, 'signcerts', `Admin@${this.orgDomain}-cert.pem`);
      if (!fs.existsSync(certPath)) {
        logger.warn('Admin certificate not found', { path: certPath });
        return null;
      }
      const certificate = fs.readFileSync(certPath, 'utf8');

      // Read private key
      const keystorePath = path.join(adminPath, 'keystore');
      const keyFiles = fs.readdirSync(keystorePath).filter((f) => f.endsWith('_sk'));
      if (keyFiles.length === 0) {
        logger.warn('Admin private key not found', { path: keystorePath });
        return null;
      }
      const privateKeyPath = path.join(keystorePath, keyFiles[0]);
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      logger.debug('Admin credentials loaded successfully');

      return {
        certificate: Buffer.from(certificate).toString('base64'),
        privateKey: Buffer.from(privateKey).toString('base64'),
        mspId: this.mspId,
      };
    } catch (error: any) {
      logger.error('Failed to load admin credentials', {
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }

  /**
   * Get User1 certificate and private key
   */
  static getUser1Credentials(): { certificate: string; privateKey: string; mspId: string } | null {
    try {
      const userPath = path.join(
        this.cryptoConfigPath,
        'peerOrganizations',
        this.orgDomain,
        'users',
        `User1@${this.orgDomain}`,
        'msp'
      );

      // Read certificate
      const certPath = path.join(userPath, 'signcerts', `User1@${this.orgDomain}-cert.pem`);
      if (!fs.existsSync(certPath)) {
        logger.warn('User1 certificate not found', { path: certPath });
        return null;
      }
      const certificate = fs.readFileSync(certPath, 'utf8');

      // Read private key
      const keystorePath = path.join(userPath, 'keystore');
      const keyFiles = fs.readdirSync(keystorePath).filter((f) => f.endsWith('_sk'));
      if (keyFiles.length === 0) {
        logger.warn('User1 private key not found', { path: keystorePath });
        return null;
      }
      const privateKeyPath = path.join(keystorePath, keyFiles[0]);
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      logger.debug('User1 credentials loaded successfully');

      return {
        certificate: Buffer.from(certificate).toString('base64'),
        privateKey: Buffer.from(privateKey).toString('base64'),
        mspId: this.mspId,
      };
    } catch (error: any) {
      logger.error('Failed to load User1 credentials', {
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }

  /**
   * Get certificate for query operations (public read)
   * Returns Admin certificate without private key
   */
  static getPublicReadCertificate(): { certificate: string; mspId: string } | null {
    try {
      const adminPath = path.join(
        this.cryptoConfigPath,
        'peerOrganizations',
        this.orgDomain,
        'users',
        `Admin@${this.orgDomain}`,
        'msp'
      );

      const certPath = path.join(adminPath, 'signcerts', `Admin@${this.orgDomain}-cert.pem`);
      if (!fs.existsSync(certPath)) {
        logger.warn('Admin certificate not found for public read', { path: certPath });
        return null;
      }
      const certificate = fs.readFileSync(certPath, 'utf8');

      return {
        certificate: Buffer.from(certificate).toString('base64'),
        mspId: this.mspId,
      };
    } catch (error: any) {
      logger.error('Failed to load public read certificate', {
        error: error.message,
      });
      return null;
    }
  }
}

