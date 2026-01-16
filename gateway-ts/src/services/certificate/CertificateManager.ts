import logger from '@core/logger';
import { CertificateError } from '@core/errors';
import * as forge from 'node-forge';

export class CertificateManager {
  /**
   * Decode Base64 certificate to Buffer
   */
  static decodeBase64Certificate(certB64: string): Buffer {
    try {
      if (!certB64) {
        throw new CertificateError('Certificate is empty');
      }

      const buffer = Buffer.from(certB64, 'base64');

      if (buffer.length === 0) {
        throw new CertificateError('Decoded certificate is empty');
      }

      return buffer;
    } catch (error: any) {
      logger.error('Failed to decode Base64 certificate', { error: error.message });
      throw new CertificateError(`Failed to decode certificate: ${error.message}`);
    }
  }

  /**
   * Decode Base64 private key to Buffer
   */
  static decodeBase64PrivateKey(keyB64: string): Buffer {
    try {
      if (!keyB64) {
        throw new CertificateError('Private key is empty');
      }

      const buffer = Buffer.from(keyB64, 'base64');

      if (buffer.length === 0) {
        throw new CertificateError('Decoded private key is empty');
      }

      return buffer;
    } catch (error: any) {
      logger.error('Failed to decode Base64 private key', { error: error.message });
      throw new CertificateError(`Failed to decode private key: ${error.message}`);
    }
  }

  /**
   * Parse PEM certificate
   */
  static parsePemCertificate(certBytes: Buffer): any {
    try {
      const pem = certBytes.toString('utf-8');

      if (!pem.includes('BEGIN CERTIFICATE') || !pem.includes('END CERTIFICATE')) {
        throw new CertificateError('Invalid certificate format: missing PEM markers');
      }

      const cert = forge.pki.certificateFromPem(pem);
      return cert;
    } catch (error: any) {
      logger.error('Failed to parse PEM certificate', { error: error.message });
      throw new CertificateError(`Failed to parse certificate: ${error.message}`);
    }
  }

  /**
   * Validate certificate format
   */
  static validateCertificateFormat(certBytes: Buffer): boolean {
    try {
      const pem = certBytes.toString('utf-8');
      return pem.includes('BEGIN CERTIFICATE') && pem.includes('END CERTIFICATE');
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract certificate subject (CN - Common Name)
   */
  static extractCertificateSubject(certBytes: Buffer): string {
    try {
      const cert = this.parsePemCertificate(certBytes);
      const cnAttr = cert.subject.getField({ name: 'commonName' });
      return cnAttr ? cnAttr.value : 'Unknown';
    } catch (error: any) {
      logger.warn('Failed to extract certificate subject', { error: error.message });
      return 'Unknown';
    }
  }

  /**
   * Check if certificate is valid (not expired)
   */
  static isCertificateValid(certBytes: Buffer): boolean {
    try {
      const cert = this.parsePemCertificate(certBytes);
      const now = new Date();

      if (cert.validity.notBefore > now) {
        logger.warn('Certificate not yet valid', {
          notBefore: cert.validity.notBefore,
        });
        return false;
      }

      if (cert.validity.notAfter < now) {
        logger.warn('Certificate expired', {
          notAfter: cert.validity.notAfter,
        });
        return false;
      }

      return true;
    } catch (error: any) {
      logger.warn('Failed to validate certificate', { error: error.message });
      return false;
    }
  }
}
