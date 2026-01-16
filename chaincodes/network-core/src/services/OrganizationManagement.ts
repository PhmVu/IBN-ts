/**
 * Organization Management Functions
 * Handles organization lifecycle: Register, Approve, Suspend, Revoke, Query
 */

import { Context } from 'fabric-contract-api';
import { Organization, OrgStatus } from '../interfaces';
import { OrganizationValidator } from '../validators/Validators';
import { Helpers } from '../utils/Helpers';

export class OrganizationManagement {
    /**
     * Register a new organization
     * Anyone can register, but needs SuperAdmin approval
     */
    static async RegisterOrganization(
        ctx: Context,
        orgId: string,
        mspId: string,
        name: string,
        domain: string,
        contactEmail: string,
        contactPhone: string,
        address: string,
        businessLicense: string,
        taxId: string,
        certificationsJSON: string,
        caUrl: string,
        peerEndpointsJSON: string,
        metadataJSON: string
    ): Promise<string> {
        // Check if organization already exists
        const exists = await Helpers.exists(ctx, orgId);
        if (exists) {
            throw new Error(`Organization ${orgId} already exists`);
        }

        // Parse JSON inputs
        const certifications = Helpers.parseJSON<string[]>(certificationsJSON);
        const peerEndpoints = Helpers.parseJSON<string[]>(peerEndpointsJSON);
        const metadata = Helpers.parseJSON<Record<string, any>>(metadataJSON);

        // Get caller info
        const registeredBy = Helpers.getCallerMspId(ctx);
        const timestamp = Helpers.getCurrentTimestamp();

        // Create organization object
        const organization: Organization = {
            orgId,
            mspId,
            name,
            domain,
            registeredBy,
            registeredAt: timestamp,
            status: OrgStatus.PENDING,
            contactEmail,
            contactPhone,
            address,
            businessLicense,
            taxId,
            certifications,
            caUrl,
            peerEndpoints,
            metadata,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Validate organization
        OrganizationValidator.validate(organization);

        // Save to ledger
        await Helpers.putData(ctx, orgId, organization);

        // Emit event
        Helpers.emitEvent(ctx, 'ORG_REGISTERED', {
            orgId,
            mspId,
            name,
            registeredBy,
            timestamp
        });

        console.info(`Organization ${orgId} registered successfully`);
        return JSON.stringify(organization);
    }

    /**
     * Approve an organization (SuperAdmin only)
     */
    static async ApproveOrganization(
        ctx: Context,
        orgId: string,
        comments?: string
    ): Promise<string> {
        // Only SuperAdmin can approve
        Helpers.requireSuperAdmin(ctx);

        // Get organization
        const organization = await Helpers.getData<Organization>(ctx, orgId);

        // Validate current status
        if (organization.status !== OrgStatus.PENDING) {
            throw new Error(`Cannot approve organization with status: ${organization.status}`);
        }

        // Get approver info
        const approvedBy = Helpers.getCallerMspId(ctx);
        const timestamp = Helpers.getCurrentTimestamp();

        // Update organization
        organization.status = OrgStatus.APPROVED;
        organization.approvedBy = approvedBy;
        organization.approvedAt = timestamp;
        organization.updatedAt = timestamp;

        // Save to ledger
        await Helpers.putData(ctx, orgId, organization);

        // Emit event
        Helpers.emitEvent(ctx, 'ORG_APPROVED', {
            orgId,
            mspId: organization.mspId,
            approvedBy,
            timestamp,
            comments
        });

        console.info(`Organization ${orgId} approved by ${approvedBy}`);
        return JSON.stringify(organization);
    }

    /**
     * Suspend an organization (SuperAdmin only)
     */
    static async SuspendOrganization(
        ctx: Context,
        orgId: string,
        reason: string
    ): Promise<string> {
        // Only SuperAdmin can suspend
        Helpers.requireSuperAdmin(ctx);

        // Validate reason
        if (!reason || reason.trim().length === 0) {
            throw new Error('Suspension reason is required');
        }

        // Get organization
        const organization = await Helpers.getData<Organization>(ctx, orgId);

        // Validate current status
        if (organization.status !== OrgStatus.APPROVED) {
            throw new Error(`Cannot suspend organization with status: ${organization.status}`);
        }

        // Get suspender info
        const suspendedBy = Helpers.getCallerMspId(ctx);
        const timestamp = Helpers.getCurrentTimestamp();

        // Update organization
        organization.status = OrgStatus.SUSPENDED;
        organization.updatedAt = timestamp;

        // Add suspension info to metadata
        if (!organization.metadata.suspensions) {
            organization.metadata.suspensions = [];
        }
        organization.metadata.suspensions.push({
            suspendedBy,
            suspendedAt: timestamp,
            reason
        });

        // Save to ledger
        await Helpers.putData(ctx, orgId, organization);

        // Emit event
        Helpers.emitEvent(ctx, 'ORG_SUSPENDED', {
            orgId,
            mspId: organization.mspId,
            suspendedBy,
            timestamp,
            reason
        });

        console.info(`Organization ${orgId} suspended by ${suspendedBy}`);
        return JSON.stringify(organization);
    }

    /**
     * Revoke an organization permanently (SuperAdmin only)
     */
    static async RevokeOrganization(
        ctx: Context,
        orgId: string,
        reason: string
    ): Promise<string> {
        // Only SuperAdmin can revoke
        Helpers.requireSuperAdmin(ctx);

        // Validate reason
        if (!reason || reason.trim().length === 0) {
            throw new Error('Revocation reason is required');
        }

        // Get organization
        const organization = await Helpers.getData<Organization>(ctx, orgId);

        // Cannot revoke already revoked org
        if (organization.status === OrgStatus.REVOKED) {
            throw new Error('Organization is already revoked');
        }

        // Get revoker info
        const revokedBy = Helpers.getCallerMspId(ctx);
        const timestamp = Helpers.getCurrentTimestamp();

        // Update organization
        organization.status = OrgStatus.REVOKED;
        organization.updatedAt = timestamp;

        // Add revocation info to metadata
        organization.metadata.revocation = {
            revokedBy,
            revokedAt: timestamp,
            reason
        };

        // Save to ledger
        await Helpers.putData(ctx, orgId, organization);

        // Emit event
        Helpers.emitEvent(ctx, 'ORG_REVOKED', {
            orgId,
            mspId: organization.mspId,
            revokedBy,
            timestamp,
            reason
        });

        console.info(`Organization ${orgId} revoked by ${revokedBy}`);
        return JSON.stringify(organization);
    }

    /**
     * Query organizations using CouchDB rich query
     */
    static async QueryOrganizations(
        ctx: Context,
        queryJSON: string
    ): Promise<string> {
        // Parse query
        const query = Helpers.parseJSON<any>(queryJSON);

        // Build CouchDB query
        const queryString = JSON.stringify({
            selector: query
        });

        // Execute query
        const organizations = await Helpers.queryData<Organization>(ctx, queryString);

        console.info(`Found ${organizations.length} organizations`);
        return JSON.stringify(organizations);
    }
}
