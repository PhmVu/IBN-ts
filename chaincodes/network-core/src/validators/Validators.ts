/**
 * Validation utilities for NetworkCore chaincode
 */

import {
    Organization,
    OrgStatus,
    ChaincodeProposal,
    ProposalStatus,
    ChannelConfig,
    ChannelStatus,
    PlatformPolicy,
    PolicyType,
    AuditEvent,
    AuditEventType
} from '../interfaces';

/**
 * Validation error class
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Organization Validators
 */
export class OrganizationValidator {
    /**
     * Validate organization ID format
     */
    static validateOrgId(orgId: string): void {
        if (!orgId || orgId.trim().length === 0) {
            throw new ValidationError('Organization ID is required');
        }
        if (orgId.length < 3 || orgId.length > 50) {
            throw new ValidationError('Organization ID must be 3-50 characters');
        }
        if (!/^[a-zA-Z0-9-]+$/.test(orgId)) {
            throw new ValidationError('Organization ID must be alphanumeric with hyphens only');
        }
    }

    /**
     * Validate MSP ID format
     */
    static validateMspId(mspId: string): void {
        if (!mspId || mspId.trim().length === 0) {
            throw new ValidationError('MSP ID is required');
        }
        if (!mspId.endsWith('MSP')) {
            throw new ValidationError('MSP ID must end with "MSP"');
        }
    }

    /**
     * Validate email format
     */
    static validateEmail(email: string): void {
        if (!email || email.trim().length === 0) {
            throw new ValidationError('Email is required');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ValidationError('Invalid email format');
        }
    }

    /**
     * Validate organization status
     */
    static validateStatus(status: string): void {
        const validStatuses = Object.values(OrgStatus);
        if (!validStatuses.includes(status as OrgStatus)) {
            throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
    }

    /**
     * Validate complete organization object
     */
    static validate(org: Organization): void {
        this.validateOrgId(org.orgId);
        this.validateMspId(org.mspId);
        this.validateEmail(org.contactEmail);
        this.validateStatus(org.status);

        if (!org.name || org.name.trim().length < 3) {
            throw new ValidationError('Organization name must be at least 3 characters');
        }

        if (!org.businessLicense || org.businessLicense.trim().length === 0) {
            throw new ValidationError('Business license is required');
        }

        if (!org.taxId || org.taxId.trim().length === 0) {
            throw new ValidationError('Tax ID is required');
        }
    }
}

/**
 * Chaincode Proposal Validators
 */
export class ChaincodeProposalValidator {
    /**
     * Validate chaincode name
     */
    static validateChaincodeName(name: string): void {
        if (!name || name.trim().length === 0) {
            throw new ValidationError('Chaincode name is required');
        }
        if (name.length < 3 || name.length > 50) {
            throw new ValidationError('Chaincode name must be 3-50 characters');
        }
        if (!/^[a-z0-9-]+$/.test(name)) {
            throw new ValidationError('Chaincode name must be lowercase alphanumeric with hyphens');
        }
    }

    /**
     * Validate semantic version
     */
    static validateVersion(version: string): void {
        if (!version || version.trim().length === 0) {
            throw new ValidationError('Version is required');
        }
        const semverRegex = /^\d+\.\d+\.\d+$/;
        if (!semverRegex.test(version)) {
            throw new ValidationError('Version must follow semantic versioning (e.g., 1.0.0)');
        }
    }

    /**
     * Validate source code hash
     */
    static validateSourceCodeHash(hash: string): void {
        if (!hash || hash.trim().length === 0) {
            throw new ValidationError('Source code hash is required');
        }
        if (hash.length !== 64) {
            throw new ValidationError('Source code hash must be 64 characters (SHA256)');
        }
        if (!/^[a-f0-9]+$/.test(hash)) {
            throw new ValidationError('Source code hash must be hexadecimal');
        }
    }

    /**
     * Validate proposal status
     */
    static validateStatus(status: string): void {
        const validStatuses = Object.values(ProposalStatus);
        if (!validStatuses.includes(status as ProposalStatus)) {
            throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
    }

    /**
     * Validate complete proposal
     */
    static validate(proposal: ChaincodeProposal): void {
        this.validateChaincodeName(proposal.chaincodeName);
        this.validateVersion(proposal.version);
        this.validateSourceCodeHash(proposal.sourceCodeHash);
        this.validateStatus(proposal.status);

        if (!proposal.description || proposal.description.trim().length < 10) {
            throw new ValidationError('Description must be at least 10 characters');
        }

        if (proposal.requiredApprovals < 1) {
            throw new ValidationError('Required approvals must be at least 1');
        }

        if (!proposal.targetChannels || proposal.targetChannels.length === 0) {
            throw new ValidationError('At least one target channel is required');
        }
    }
}

/**
 * Channel Config Validators
 */
export class ChannelConfigValidator {
    /**
     * Validate channel ID
     */
    static validateChannelId(channelId: string): void {
        if (!channelId || channelId.trim().length === 0) {
            throw new ValidationError('Channel ID is required');
        }
        if (channelId.length < 3 || channelId.length > 50) {
            throw new ValidationError('Channel ID must be 3-50 characters');
        }
        if (!/^[a-z0-9-]+$/.test(channelId)) {
            throw new ValidationError('Channel ID must be lowercase alphanumeric with hyphens');
        }
    }

    /**
     * Validate block size
     */
    static validateBlockSize(size: number): void {
        if (size <= 0) {
            throw new ValidationError('Block size must be greater than 0');
        }
        if (size > 104857600) { // 100MB
            throw new ValidationError('Block size cannot exceed 100MB');
        }
    }

    /**
     * Validate batch timeout
     */
    static validateBatchTimeout(timeout: number): void {
        if (timeout <= 0) {
            throw new ValidationError('Batch timeout must be greater than 0');
        }
        if (timeout > 10000) { // 10 seconds
            throw new ValidationError('Batch timeout cannot exceed 10 seconds');
        }
    }

    /**
     * Validate complete channel config
     */
    static validate(config: ChannelConfig): void {
        this.validateChannelId(config.channelId);
        this.validateBlockSize(config.blockSize);
        this.validateBatchTimeout(config.batchTimeout);

        if (!config.organizations || config.organizations.length === 0) {
            throw new ValidationError('At least one organization is required');
        }

        if (!config.orderers || config.orderers.length === 0) {
            throw new ValidationError('At least one orderer is required');
        }
    }
}

/**
 * Platform Policy Validators
 */
export class PlatformPolicyValidator {
    /**
     * Validate policy type
     */
    static validatePolicyType(type: string): void {
        const validTypes = Object.values(PolicyType);
        if (!validTypes.includes(type as PolicyType)) {
            throw new ValidationError(`Invalid policy type. Must be one of: ${validTypes.join(', ')}`);
        }
    }

    /**
     * Validate policy version
     */
    static validateVersion(version: string): void {
        if (!version || version.trim().length === 0) {
            throw new ValidationError('Policy version is required');
        }
        const semverRegex = /^\d+\.\d+\.\d+$/;
        if (!semverRegex.test(version)) {
            throw new ValidationError('Version must follow semantic versioning (e.g., 1.0.0)');
        }
    }

    /**
     * Validate complete policy
     */
    static validate(policy: PlatformPolicy): void {
        if (!policy.policyId || policy.policyId.trim().length === 0) {
            throw new ValidationError('Policy ID is required');
        }

        if (!policy.policyName || policy.policyName.trim().length < 3) {
            throw new ValidationError('Policy name must be at least 3 characters');
        }

        this.validatePolicyType(policy.policyType);
        this.validateVersion(policy.version);

        if (!policy.rules || policy.rules.length === 0) {
            throw new ValidationError('At least one rule is required');
        }

        if (!policy.appliesTo || policy.appliesTo.length === 0) {
            throw new ValidationError('Policy must apply to at least one target');
        }
    }
}

/**
 * Audit Event Validators
 */
export class AuditEventValidator {
    /**
     * Validate event type
     */
    static validateEventType(type: string): void {
        const validTypes = Object.values(AuditEventType);
        if (!validTypes.includes(type as AuditEventType)) {
            throw new ValidationError(`Invalid event type. Must be one of: ${validTypes.join(', ')}`);
        }
    }

    /**
     * Validate complete audit event
     */
    static validate(event: AuditEvent): void {
        if (!event.eventId || event.eventId.trim().length === 0) {
            throw new ValidationError('Event ID is required');
        }

        this.validateEventType(event.eventType);

        if (!event.actor || event.actor.trim().length === 0) {
            throw new ValidationError('Actor is required');
        }

        if (!event.action || event.action.trim().length === 0) {
            throw new ValidationError('Action is required');
        }

        if (!event.resource || event.resource.trim().length === 0) {
            throw new ValidationError('Resource is required');
        }

        if (!event.txId || event.txId.trim().length === 0) {
            throw new ValidationError('Transaction ID is required');
        }
    }
}
