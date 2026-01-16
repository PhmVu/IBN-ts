import logger from '@core/logger';
import { FabricIdentityConfig } from '@core/types';

/**
 * Wraps Fabric certificate and private key for identity management
 */
export class FabricIdentity {
  mspId: string;
  certificate: Buffer;
  privateKey?: Buffer;

  constructor(mspId: string, certificate: Buffer, privateKey?: Buffer) {
    if (!mspId) {
      throw new Error('MSP ID is required');
    }

    if (!certificate || certificate.length === 0) {
      throw new Error('Certificate buffer is required and cannot be empty');
    }

    this.mspId = mspId;
    this.certificate = certificate;
    this.privateKey = privateKey;

    logger.debug('FabricIdentity created', {
      mspId: this.mspId,
      certLength: this.certificate.length,
      hasPrivateKey: !!this.privateKey,
    });
  }

  /**
   * Check if identity has private key (for signing)
   */
  hasPrivateKey(): boolean {
    return !!this.privateKey && this.privateKey.length > 0;
  }

  /**
   * Get identity configuration
   */
  getConfig(): FabricIdentityConfig {
    return {
      mspId: this.mspId,
      certificate: this.certificate,
      privateKey: this.privateKey,
    };
  }

  /**
   * Get certificate as string
   */
  getCertificateString(): string {
    return this.certificate.toString('utf-8');
  }

  /**
   * Get private key as string
   */
  getPrivateKeyString(): string {
    if (!this.privateKey) {
      throw new Error('Private key is not available');
    }
    return this.privateKey.toString('utf-8');
  }
}
