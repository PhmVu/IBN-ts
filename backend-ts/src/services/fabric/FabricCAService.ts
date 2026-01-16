import FabricCAServices from 'fabric-ca-client';
import { X509Certificate } from 'crypto';
import { db } from '@config/knex';
import logger from '@core/logger';
import { walletService } from '../wallet/WalletService';
import crypto from 'crypto';

/**
 * Fabric CA Service
 * Handles user registration and enrollment with Hyperledger Fabric CA
 * 
 * Flow:
 * 1. Register user with CA (admin privilege required)
 * 2. Enroll user to get X.509 certificate and private key
 * 3. Store encrypted identity in wallet
 * 4. Update user record with enrollment status
 * 
 * IMPORTANT: This implementation follows Fabric SDK 2.x standards
 * - Uses fabric-ca-client for CA operations
 * - Does NOT use User.createUser() (doesn't exist in SDK 2.x)
 * - Builds User object manually for CA client
 */
export class FabricCAService {
    private caClients: Map<string, FabricCAServices> = new Map();

    /**
     * Get or create CA client for organization
     */
    private async getCAClient(mspId: string): Promise<FabricCAServices> {
        // Check cache
        if (this.caClients.has(mspId)) {
            return this.caClients.get(mspId)!;
        }

        // Get organization from database
        const org = await db('organizations')
            .where({ msp_id: mspId })
            .first();

        if (!org) {
            throw new Error(`Organization not found for MSP ID: ${mspId}`);
        }

        if (!org.ca_url) {
            throw new Error(`CA URL not configured for organization: ${org.name}`);
        }

        // Get CA certificate (TLS cert for secure connection)
        let caTLSCACerts: string | undefined;

        if (org.ca_cert) {
            caTLSCACerts = org.ca_cert;
        }

        // Create CA client
        const caClient = new FabricCAServices(
            org.ca_url,
            {
                trustedRoots: caTLSCACerts ? [caTLSCACerts] : [],
                verify: false // Set to true in production with proper CA cert
            },
            org.ca_name || `ca-${org.name.toLowerCase()}`
        );

        // Cache client
        this.caClients.set(mspId, caClient);

        logger.info('CA client created', {
            mspId,
            caUrl: org.ca_url,
            caName: org.ca_name
        });

        return caClient;
    }

    /**
     * Create User instance from identity using fabric-common User class
     * This uses the internal User class that CA client expects
     * 
     * @param name - User name
     * @param identity - Identity from our wallet
     * @returns User instance
     */
    private async createUserFromIdentity(name: string, identity: any): Promise<any> {
        // Import required classes from fabric-common
        const fabricCommon = await import('fabric-common');
        const User = fabricCommon.User;

        // Create User instance
        const user = new User(name);

        // Create Key object from private key PEM
        const cryptoSuite = fabricCommon.Utils.newCryptoSuite();
        const privateKeyObj = cryptoSuite.createKeyFromRaw(identity.privateKey);

        // Set enrollment with proper Key object
        user.setEnrollment(
            privateKeyObj,
            identity.certificate,
            identity.mspId
        );

        return user;
    }

    /**
     * Enroll admin user
     * This should be run once during setup
     * 
     * @param mspId - Organization MSP ID
     * @param enrollmentID - Admin username (usually 'admin')
     * @param enrollmentSecret - Admin password
     */
    async enrollAdmin(
        mspId: string,
        enrollmentID: string,
        enrollmentSecret: string
    ): Promise<void> {
        try {
            logger.info('Enrolling admin', { mspId, enrollmentID });

            const caClient = await this.getCAClient(mspId);

            // Enroll admin - NO User object needed
            const enrollment = await caClient.enroll({
                enrollmentID,
                enrollmentSecret
            });

            // Store in wallet
            const walletLabel = `${enrollmentID}@${mspId.toLowerCase()}`;
            await walletService.put(walletLabel, {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
                mspId,
                type: 'X.509'
            });

            logger.info('Admin enrolled successfully', {
                mspId,
                enrollmentID,
                walletLabel
            });
        } catch (error: any) {
            logger.error('Failed to enroll admin', {
                mspId,
                enrollmentID,
                error: error.message,
                stack: error.stack
            });
            throw new Error(`Admin enrollment failed: ${error.message}`);
        }
    }

    /**
     * Ensure admin is enrolled (auto-enroll if needed)
     * This method is idempotent - safe to call multiple times
     * 
     * @param mspId - Organization MSP ID
     * @param enrollmentID - Admin username (default: 'admin')
     * @param enrollmentSecret - Admin password (default: 'adminpw')
     */
    async ensureAdminEnrolled(
        mspId: string,
        enrollmentID: string = 'admin',
        enrollmentSecret: string = process.env.FABRIC_CA_ADMIN_PASSWORD || 'adminpw'
    ): Promise<void> {
        const adminLabel = `${enrollmentID}@${mspId.toLowerCase()}`;

        try {
            // Check if admin already exists in wallet (DB)
            const existing = await db('wallets')
                .where({ label: adminLabel, type: 'admin' })
                .first();

            if (existing) {
                logger.debug('Admin already enrolled, skipping', { mspId, adminLabel });
                return;
            }

            logger.info('Admin not enrolled, auto-enrolling', { mspId, adminLabel });

            // Get organization config
            const org = await db('organizations')
                .where({ msp_id: mspId })
                .first();

            if (!org) {
                throw new Error(`Organization not found for MSP: ${mspId}`);
            }

            if (!org.ca_url) {
                throw new Error(`CA URL not configured for organization: ${org.name}`);
            }

            // Enroll admin
            const caClient = await this.getCAClient(mspId);
            const enrollment = await caClient.enroll({
                enrollmentID,
                enrollmentSecret
            });

            // Store in wallet with ENCRYPTION using WalletService
            // This ensures private key is encrypted with AES-256-GCM
            const privateKeyPem = enrollment.key.toBytes().toString();
            await walletService.put(adminLabel, {
                certificate: enrollment.certificate,
                privateKey: privateKeyPem,
                mspId,
                type: 'X.509'
            });

            // Update wallet type to 'admin' for identification
            await db('wallets')
                .where({ label: adminLabel })
                .update({ type: 'admin' });

            logger.info('Admin auto-enrolled successfully', {
                mspId,
                enrollmentID,
                adminLabel
            });
        } catch (error: any) {
            logger.error('Failed to ensure admin enrolled', {
                mspId,
                adminLabel,
                error: error.message,
                stack: error.stack
            });
            throw new Error(`Admin enrollment check failed: ${error.message}`);
        }
    }

    /**
     * Register new user with CA
     * Requires admin identity
     * 
     * @param username - Username to register
     * @param mspId - Organization MSP ID
     * @param role - User role (default: 'client')
     * @returns Enrollment secret for user
     */
    async registerUser(
        username: string,
        mspId: string,
        role: string = 'client'
    ): Promise<string> {
        try {
            logger.info('Registering user with CA', { username, mspId, role });

            const caClient = await this.getCAClient(mspId);

            // Get admin identity from our wallet
            const adminLabel = `admin@${mspId.toLowerCase()}`;
            const adminIdentity = await walletService.get(adminLabel);

            if (!adminIdentity) {
                throw new Error(
                    `Admin identity not found: ${adminLabel}. ` +
                    `Please enroll admin first.`
                );
            }

            // Create proper User instance from identity
            const adminUser = await this.createUserFromIdentity('admin', adminIdentity);

            logger.debug('Admin user object created from wallet', {
                adminLabel,
                mspId
            });

            // Register new user with CA using proper User object
            const secret = await caClient.register(
                {
                    enrollmentID: username,
                    role: role,
                    affiliation: '',
                    maxEnrollments: -1,
                    attrs: []
                },
                adminUser
            );

            logger.info('User registered with CA', {
                username,
                mspId,
                secret: '***' // Don't log actual secret
            });

            return secret;
        } catch (error: any) {
            logger.error('Failed to register user', {
                username,
                mspId,
                error: error.message,
                stack: error.stack
            });
            throw new Error(`User registration failed: ${error.message}`);
        }
    }

    /**
     * Enroll user with CA
     * Uses enrollment secret from registration
     * 
     * @param username - Username to enroll
     * @param enrollmentSecret - Secret from registration
     * @param mspId - Organization MSP ID
     * @returns Certificate serial number
     */
    async enrollUser(
        username: string,
        enrollmentSecret: string,
        mspId: string
    ): Promise<string> {
        try {
            logger.info('Enrolling user', { username, mspId });

            const caClient = await this.getCAClient(mspId);

            // Enroll user
            const enrollment = await caClient.enroll({
                enrollmentID: username,
                enrollmentSecret
            });

            // Extract certificate serial number
            const certSerial = this.extractCertificateSerial(enrollment.certificate);

            // Store in wallet
            const walletLabel = `${username}@${mspId.toLowerCase()}`;
            await walletService.put(walletLabel, {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
                mspId,
                type: 'X.509'
            });

            logger.info('User enrolled successfully', {
                username,
                mspId,
                walletLabel,
                certSerial
            });

            return certSerial;
        } catch (error: any) {
            logger.error('Failed to enroll user', {
                username,
                mspId,
                error: error.message,
                stack: error.stack
            });
            throw new Error(`User enrollment failed: ${error.message}`);
        }
    }

    /**
     * Re-enroll user (renew certificate)
     * 
     * @param username - Username to re-enroll
     * @param mspId - Organization MSP ID
     * @returns New certificate serial number
     */
    async reenrollUser(username: string, mspId: string): Promise<string> {
        try {
            logger.info('Re-enrolling user', { username, mspId });

            const caClient = await this.getCAClient(mspId);

            // Get current identity
            const walletLabel = `${username}@${mspId.toLowerCase()}`;
            const currentIdentity = await walletService.get(walletLabel);

            if (!currentIdentity) {
                throw new Error(`User identity not found: ${walletLabel}`);
            }

            // Create User instance from current identity
            const userObject = await this.createUserFromIdentity(username, currentIdentity);

            // Re-enroll using current identity
            const enrollment = await (caClient as any).reenroll(userObject);

            // Extract new certificate serial
            const certSerial = this.extractCertificateSerial(enrollment.certificate);

            // Update wallet with new certificate
            await walletService.put(walletLabel, {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
                mspId,
                type: 'X.509'
            });

            logger.info('User re-enrolled successfully', {
                username,
                mspId,
                newCertSerial: certSerial
            });

            return certSerial;
        } catch (error: any) {
            logger.error('Failed to re-enroll user', {
                username,
                mspId,
                error: error.message
            });
            throw new Error(`User re-enrollment failed: ${error.message}`);
        }
    }

    /**
     * Revoke user certificate
     * 
     * @param username - Username to revoke
     * @param mspId - Organization MSP ID
     * @param reason - Revocation reason
     */
    async revokeUser(
        username: string,
        mspId: string,
        reason: string = 'User requested'
    ): Promise<void> {
        try {
            logger.info('Revoking user certificate', { username, mspId, reason });

            const caClient = await this.getCAClient(mspId);

            // Get admin identity
            const adminLabel = `admin@${mspId.toLowerCase()}`;
            const adminIdentity = await walletService.get(adminLabel);

            if (!adminIdentity) {
                throw new Error(`Admin identity not found: ${adminLabel}`);
            }

            // Get user's certificate serial
            const walletLabel = `${username}@${mspId.toLowerCase()}`;
            const userIdentity = await walletService.get(walletLabel);

            if (!userIdentity) {
                throw new Error(`User identity not found: ${walletLabel}`);
            }

            const certSerial = this.extractCertificateSerial(userIdentity.certificate);

            // Create admin User instance from identity
            const adminUser = await this.createUserFromIdentity('admin', adminIdentity);

            // Revoke certificate using admin context
            await (caClient as any).revoke(
                {
                    enrollmentID: username,
                    serial: certSerial,
                    aki: '', // Authority Key Identifier (optional)
                    reason: reason
                },
                adminUser
            );

            // Add to revocation list in database
            await db('certificate_revocations').insert({
                certificate_serial: certSerial,
                wallet_id: walletLabel,
                revocation_reason: reason,
                revoked_at: new Date()
            });

            logger.info('User certificate revoked', {
                username,
                mspId,
                certSerial
            });
        } catch (error: any) {
            logger.error('Failed to revoke user certificate', {
                username,
                mspId,
                error: error.message
            });
            throw new Error(`Certificate revocation failed: ${error.message}`);
        }
    }

    /**
     * Extract certificate serial number from X.509 certificate
     */
    private extractCertificateSerial(certificate: string): string {
        try {
            // Use Node.js crypto module to parse certificate
            const cert = new X509Certificate(certificate);

            // Get serial number (hex string)
            const serial = cert.serialNumber;

            // Format: Add colons every 2 characters
            const formatted = serial.match(/.{1,2}/g)?.join(':') || serial;

            logger.debug('Certificate serial extracted', {
                serial: formatted,
                subject: cert.subject,
                issuer: cert.issuer
            });

            return formatted;
        } catch (error: any) {
            logger.error('Failed to extract certificate serial', {
                error: error.message
            });

            // Fallback: generate hash of certificate
            const hash = crypto
                .createHash('sha256')
                .update(certificate)
                .digest('hex')
                .substring(0, 40);

            const formatted = hash.match(/.{1,2}/g)?.join(':') || hash;

            logger.warn('Using certificate hash as serial', { serial: formatted });

            return formatted;
        }
    }

    /**
     * Check if certificate is revoked
     */
    async isCertificateRevoked(certSerial: string): Promise<boolean> {
        try {
            const revocation = await db('certificate_revocations')
                .where({ certificate_serial: certSerial })
                .first();

            return !!revocation;
        } catch (error: any) {
            logger.error('Failed to check certificate revocation', {
                certSerial,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Validate certificate
     * 
     * @param certificatePEM - Certificate in PEM format
     * @returns Validation result
     */
    validateCertificate(certificatePEM: string): {
        valid: boolean;
        subject?: string;
        issuer?: string;
        validFrom?: string;
        validTo?: string;
        expired?: boolean;
        error?: string;
    } {
        try {
            const cert = new X509Certificate(certificatePEM);

            const now = new Date();
            const validFrom = new Date(cert.validFrom);
            const validTo = new Date(cert.validTo);

            const expired = now > validTo;
            const notYetValid = now < validFrom;

            return {
                valid: !expired && !notYetValid,
                subject: cert.subject,
                issuer: cert.issuer,
                validFrom: cert.validFrom,
                validTo: cert.validTo,
                expired
            };
        } catch (error: any) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
}

// Singleton instance
export const fabricCAService = new FabricCAService();
