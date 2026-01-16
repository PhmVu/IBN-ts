import { CertificateManager } from '../../src/services/certificate/CertificateManager';
import { CertificateError } from '../../src/core/errors';

describe('CertificateManager', () => {
  describe('decodeBase64Certificate', () => {
    it('should decode valid base64 certificate', () => {
      // Mock certificate in PEM format
      const certPem = `-----BEGIN CERTIFICATE-----
MIICnjCCAgcCAQAwDQYJKoZIhvcNAQEFBQAwgY8xCzAJBgNVBAYTAlVTMQswCQYD
VQQIEwJDQTEWMBQGA1UEBxMNU2FuIEZyYW5jaXNjbzENMAsGA1UEChMEQWNtZTEX
MBUGA1UECxMuTWFudWZhY3R1cmluZzEcMBoGA1UEAxMTQWNtZSBSb290IENlcnRp
ZmljYXRlMB4XDTA5MDExNjAwMDAzMFoXDTE3MDEyMTAwMDAzMFowgY8xCzAJBgNV
-----END CERTIFICATE-----`;

      const base64 = Buffer.from(certPem).toString('base64');
      const result = CertificateManager.decodeBase64Certificate(base64);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toContain('BEGIN CERTIFICATE');
    });

    it('should throw error for invalid base64', () => {
      expect(() => {
        CertificateManager.decodeBase64Certificate('!!!invalid!!!');
      }).toThrow(CertificateError);
    });
  });

  describe('validateCertificateFormat', () => {
    it('should validate PEM certificate format', () => {
      const certPem = `-----BEGIN CERTIFICATE-----
MIICnjCCAg...
-----END CERTIFICATE-----`;
      const buffer = Buffer.from(certPem);

      const result = CertificateManager.validateCertificateFormat(buffer);
      expect(result).toBe(true);
    });

    it('should reject invalid certificate format', () => {
      const invalidCert = Buffer.from('not a certificate');
      const result = CertificateManager.validateCertificateFormat(invalidCert);
      expect(result).toBe(false);
    });
  });

  describe('decodeBase64PrivateKey', () => {
    it('should decode valid base64 private key', () => {
      const keyPem = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...
-----END PRIVATE KEY-----`;

      const base64 = Buffer.from(keyPem).toString('base64');
      const result = CertificateManager.decodeBase64PrivateKey(base64);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toContain('BEGIN PRIVATE KEY');
    });

    it('should throw error for invalid base64 private key', () => {
      expect(() => {
        CertificateManager.decodeBase64PrivateKey('!!!invalid!!!');
      }).toThrow(CertificateError);
    });
  });
});
