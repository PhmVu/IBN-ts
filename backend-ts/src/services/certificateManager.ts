import fs from 'fs/promises';
import path from 'path';
import logger from '@core/logger';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Certificate Information
 */
export interface CertificateInfo {
  path: string;
  user: string;
  msp_id: string;
  domain: string;
  type: 'signcert' | 'keystore';
  expiration?: Date;
  subject?: string;
  issuer?: string;
}

/**
 * Identity with Certificate and Private Key
 */
export interface FabricIdentity {
  certificate: Buffer;
  privateKey: Buffer;
  msp_id: string;
  user: string;
}

/**
 * MSP Certificate Collection
 */
export interface MSPCertificates {
  msp_id: string;
  domain: string;
  users: {
    [username: string]: {
      signcert?: string;
      keystore?: string[];
    };
  };
}

/**
 * CertificateManager Service
 * Scans crypto-config directory and loads Fabric certificates/keys
 */
export class CertificateManager {
  private cryptoConfigPath: string;
  private certificateCache: Map<string, MSPCertificates> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastScan: number = 0;

  constructor(cryptoConfigPath: string = 'crypto-config') {
    this.cryptoConfigPath = cryptoConfigPath;
  }

  /**
   * Scan crypto-config directory for all MSPs and certificates
   */
  async scanCryptoConfig(): Promise<Map<string, MSPCertificates>> {
    const now = Date.now();
    
    // Return cached results if still valid
    if (this.certificateCache.size > 0 && (now - this.lastScan) < this.cacheExpiry) {
      logger.debug('Returning cached certificate scan results');
      return this.certificateCache;
    }

    try {
      logger.info('Scanning crypto-config directory', { path: this.cryptoConfigPath });

      const peerOrgsPath = path.join(this.cryptoConfigPath, 'peerOrganizations');
      
      // Check if directory exists
      try {
        await fs.access(peerOrgsPath);
      } catch {
        logger.warn('Crypto-config directory not found', { path: peerOrgsPath });
        return new Map();
      }

      const domains = await fs.readdir(peerOrgsPath);
      const results = new Map<string, MSPCertificates>();

      for (const domain of domains) {
        const domainPath = path.join(peerOrgsPath, domain);
        const stat = await fs.stat(domainPath);

        if (!stat.isDirectory()) continue;

        // Get MSP ID from config or derive from domain
        const mspId = await this.getMSPId(domainPath, domain);
        
        // Scan users directory
        const usersPath = path.join(domainPath, 'users');
        try {
          await fs.access(usersPath);
          const certificates = await this.scanUsersDirectory(usersPath, mspId, domain);
          results.set(mspId, certificates);
        } catch (error) {
          logger.debug('No users directory found', { domain, error });
        }
      }

      this.certificateCache = results;
      this.lastScan = now;

      logger.info('Crypto-config scan complete', {
        msp_count: results.size,
        total_users: Array.from(results.values()).reduce((sum, msp) => sum + Object.keys(msp.users).length, 0),
      });

      return results;
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to scan crypto-config', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Get MSP ID from domain path
   */
  private async getMSPId(domainPath: string, domain: string): Promise<string> {
    try {
      // Try to read from msp/config.yaml
      const configPath = path.join(domainPath, 'msp', 'config.yaml');
      const configContent = await fs.readFile(configPath, 'utf-8');
      
      // Parse MSP ID from config (simplified - real parsing would use yaml library)
      const match = configContent.match(/Name:\s*(\w+)/);
      if (match) {
        return match[1];
      }
    } catch {
      // Fallback: derive from domain (e.g., org1.example.com → Org1MSP)
      const orgName = domain.split('.')[0];
      const mspId = orgName.charAt(0).toUpperCase() + orgName.slice(1) + 'MSP';
      return mspId;
    }

    return domain;
  }

  /**
   * Scan users directory for certificates
   */
  private async scanUsersDirectory(
    usersPath: string,
    mspId: string,
    domain: string
  ): Promise<MSPCertificates> {
    const users: { [username: string]: { signcert?: string; keystore?: string[] } } = {};

    const userDirs = await fs.readdir(usersPath);

    for (const userDir of userDirs) {
      const userPath = path.join(usersPath, userDir);
      const stat = await fs.stat(userPath);

      if (!stat.isDirectory()) continue;

      const username = userDir.split('@')[0]; // Extract username before @domain
      const mspPath = path.join(userPath, 'msp');

      users[username] = {};

      // Scan signcerts
      try {
        const signcertsPath = path.join(mspPath, 'signcerts');
        const certs = await fs.readdir(signcertsPath);
        if (certs.length > 0) {
          users[username].signcert = path.join(signcertsPath, certs[0]);
        }
      } catch {
        // No signcerts directory
      }

      // Scan keystore
      try {
        const keystorePath = path.join(mspPath, 'keystore');
        const keys = await fs.readdir(keystorePath);
        users[username].keystore = keys.map(k => path.join(keystorePath, k));
      } catch {
        // No keystore directory
      }
    }

    return {
      msp_id: mspId,
      domain,
      users,
    };
  }

  /**
   * Get certificates for specific MSP
   */
  async getCertificatesByMSP(mspId: string): Promise<MSPCertificates | null> {
    const results = await this.scanCryptoConfig();
    return results.get(mspId) || null;
  }

  /**
   * Load identity (certificate + private key) for specific MSP and user
   */
  async loadIdentity(mspId: string, username: string): Promise<FabricIdentity> {
    try {
      logger.debug('Loading identity', { mspId, username });

      const certificates = await this.getCertificatesByMSP(mspId);
      
      if (!certificates) {
        throw new Error(`MSP not found: ${mspId}`);
      }

      const userCerts = certificates.users[username];
      
      if (!userCerts) {
        throw new Error(`User not found in MSP: ${username}@${mspId}`);
      }

      if (!userCerts.signcert) {
        throw new Error(`Certificate not found for user: ${username}@${mspId}`);
      }

      if (!userCerts.keystore || userCerts.keystore.length === 0) {
        throw new Error(`Private key not found for user: ${username}@${mspId}`);
      }

      // Read certificate
      const certificate = await fs.readFile(userCerts.signcert);

      // Read private key (first key in keystore)
      const privateKey = await fs.readFile(userCerts.keystore[0]);

      logger.info('Identity loaded successfully', {
        mspId,
        username,
        cert_size: certificate.length,
        key_size: privateKey.length,
      });

      return {
        certificate,
        privateKey,
        msp_id: mspId,
        user: username,
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to load identity', {
          mspId,
          username,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Validate certificate (check expiration)
   */
  async validateCertificate(certPath: string): Promise<boolean> {
    try {
      // Use openssl to check certificate
      const { stdout } = await execAsync(`openssl x509 -in "${certPath}" -noout -enddate`);
      
      // Parse expiration date
      const match = stdout.match(/notAfter=(.+)/);
      if (!match) {
        return false;
      }

      const expirationDate = new Date(match[1]);
      const now = new Date();

      return expirationDate > now;
    } catch (error) {
      logger.warn('Certificate validation failed', { certPath, error });
      return false;
    }
  }

  /**
   * Get certificate info (expiration, subject, issuer)
   */
  async getCertificateInfo(certPath: string): Promise<CertificateInfo | null> {
    try {
      const { stdout } = await execAsync(
        `openssl x509 -in "${certPath}" -noout -subject -issuer -enddate`
      );

      const lines = stdout.split('\n');
      const info: Partial<CertificateInfo> = {
        path: certPath,
      };

      for (const line of lines) {
        if (line.startsWith('subject=')) {
          info.subject = line.replace('subject=', '').trim();
        } else if (line.startsWith('issuer=')) {
          info.issuer = line.replace('issuer=', '').trim();
        } else if (line.startsWith('notAfter=')) {
          info.expiration = new Date(line.replace('notAfter=', '').trim());
        }
      }

      return info as CertificateInfo;
    } catch (error) {
      logger.error('Failed to get certificate info', { certPath, error });
      return null;
    }
  }

  /**
   * List all available MSPs
   */
  async listMSPs(): Promise<string[]> {
    const results = await this.scanCryptoConfig();
    return Array.from(results.keys());
  }

  /**
   * List users for specific MSP
   */
  async listMSPUsers(mspId: string): Promise<string[]> {
    const certificates = await this.getCertificatesByMSP(mspId);
    if (!certificates) {
      return [];
    }
    return Object.keys(certificates.users);
  }

  /**
   * Clear certificate cache (force rescan on next request)
   */
  clearCache(): void {
    this.certificateCache.clear();
    this.lastScan = 0;
    logger.info('Certificate cache cleared');
  }
}

export default CertificateManager;
