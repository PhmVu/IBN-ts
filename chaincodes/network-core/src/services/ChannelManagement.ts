/**
 * Channel Management Functions
 * Handles channel lifecycle: Create, Approve, Add/Remove Organizations, Query
 */

import { Context } from 'fabric-contract-api';
import { ChannelConfig, ChannelStatus, Organization, OrgStatus } from '../interfaces';
import { ChannelConfigValidator } from '../validators/Validators';
import { Helpers } from '../utils/Helpers';

export class ChannelManagement {
    /**
     * Create a new channel proposal (SuperAdmin only)
     */
    static async CreateChannelProposal(
        ctx: Context,
        channelId: string,
        channelName: string,
        organizationsJSON: string,
        orderersJSON: string,
        endorsementPolicy: string,
        lifecyclePolicy: string,
        blockSize: number,
        batchTimeout: number
    ): Promise<string> {
        // Only SuperAdmin can create channels
        Helpers.requireSuperAdmin(ctx);

        // Check if channel already exists
        const exists = await Helpers.exists(ctx, `CHANNEL_${channelId}`);
        if (exists) {
            throw new Error(`Channel ${channelId} already exists`);
        }

        // Parse JSON inputs
        const organizations = Helpers.parseJSON<string[]>(organizationsJSON);
        const orderers = Helpers.parseJSON<string[]>(orderersJSON);

        // Verify all organizations exist and are APPROVED
        for (const orgMspId of organizations) {
            const orgId = orgMspId.replace('MSP', '');
            const orgExists = await Helpers.exists(ctx, orgId);

            if (!orgExists) {
                throw new Error(`Organization ${orgId} does not exist`);
            }

            const org = await Helpers.getData<Organization>(ctx, orgId);
            if (org.status !== OrgStatus.APPROVED) {
                throw new Error(`Organization ${orgId} is not APPROVED. Current status: ${org.status}`);
            }
        }

        // Get creator info
        const createdBy = Helpers.getCallerMspId(ctx);
        const timestamp = Helpers.getCurrentTimestamp();

        // Create channel config
        const channelConfig: ChannelConfig = {
            channelId,
            channelName,
            organizations,
            orderers,
            endorsementPolicy,
            lifecyclePolicy,
            blockSize,
            batchTimeout,
            status: ChannelStatus.ACTIVE,
            createdBy,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Validate channel config
        ChannelConfigValidator.validate(channelConfig);

        // Save to ledger
        await Helpers.putData(ctx, `CHANNEL_${channelId}`, channelConfig);

        // Emit event
        Helpers.emitEvent(ctx, 'CHANNEL_CREATED', {
            channelId,
            channelName,
            organizations,
            createdBy,
            timestamp
        });

        console.info(`Channel ${channelId} created by ${createdBy}`);
        return JSON.stringify(channelConfig);
    }

    /**
     * Approve a channel proposal (SuperAdmin only)
     * Note: In this simplified version, channels are created as ACTIVE immediately
     * This function is kept for future enhancement where channels need approval workflow
     */
    static async ApproveChannelProposal(
        ctx: Context,
        channelId: string
    ): Promise<string> {
        // Only SuperAdmin can approve
        Helpers.requireSuperAdmin(ctx);

        // Get channel
        const channel = await Helpers.getData<ChannelConfig>(ctx, `CHANNEL_${channelId}`);

        // Already active
        if (channel.status === ChannelStatus.ACTIVE) {
            return JSON.stringify(channel);
        }

        // Update status
        channel.status = ChannelStatus.ACTIVE;
        channel.updatedAt = Helpers.getCurrentTimestamp();

        // Save to ledger
        await Helpers.putData(ctx, `CHANNEL_${channelId}`, channel);

        console.info(`Channel ${channelId} approved`);
        return JSON.stringify(channel);
    }

    /**
     * Add an organization to a channel (SuperAdmin only)
     */
    static async AddOrganizationToChannel(
        ctx: Context,
        channelId: string,
        orgId: string
    ): Promise<string> {
        // Only SuperAdmin can add organizations
        Helpers.requireSuperAdmin(ctx);

        // Get channel
        const channel = await Helpers.getData<ChannelConfig>(ctx, `CHANNEL_${channelId}`);

        // Verify channel is ACTIVE
        if (channel.status !== ChannelStatus.ACTIVE) {
            throw new Error(`Cannot add organization to channel with status: ${channel.status}`);
        }

        // Verify organization exists and is APPROVED
        const orgExists = await Helpers.exists(ctx, orgId);
        if (!orgExists) {
            throw new Error(`Organization ${orgId} does not exist`);
        }

        const org = await Helpers.getData<Organization>(ctx, orgId);
        if (org.status !== OrgStatus.APPROVED) {
            throw new Error(`Organization ${orgId} is not APPROVED. Current status: ${org.status}`);
        }

        // Check if organization is already in channel
        const orgMspId = org.mspId;
        if (channel.organizations.includes(orgMspId)) {
            throw new Error(`Organization ${orgMspId} is already in channel ${channelId}`);
        }

        // Add organization
        channel.organizations.push(orgMspId);
        channel.updatedAt = Helpers.getCurrentTimestamp();

        // Save to ledger
        await Helpers.putData(ctx, `CHANNEL_${channelId}`, channel);

        // Emit event
        Helpers.emitEvent(ctx, 'ORG_ADDED_TO_CHANNEL', {
            channelId,
            orgId,
            orgMspId,
            timestamp: channel.updatedAt
        });

        console.info(`Organization ${orgMspId} added to channel ${channelId}`);
        return JSON.stringify(channel);
    }

    /**
     * Remove an organization from a channel (SuperAdmin only)
     */
    static async RemoveOrganizationFromChannel(
        ctx: Context,
        channelId: string,
        orgId: string,
        reason: string
    ): Promise<string> {
        // Only SuperAdmin can remove organizations
        Helpers.requireSuperAdmin(ctx);

        // Validate reason
        if (!reason || reason.trim().length === 0) {
            throw new Error('Removal reason is required');
        }

        // Get channel
        const channel = await Helpers.getData<ChannelConfig>(ctx, `CHANNEL_${channelId}`);

        // Get organization
        const org = await Helpers.getData<Organization>(ctx, orgId);
        const orgMspId = org.mspId;

        // Check if organization is in channel
        const index = channel.organizations.indexOf(orgMspId);
        if (index === -1) {
            throw new Error(`Organization ${orgMspId} is not in channel ${channelId}`);
        }

        // Remove organization
        channel.organizations.splice(index, 1);
        channel.updatedAt = Helpers.getCurrentTimestamp();

        // Save to ledger
        await Helpers.putData(ctx, `CHANNEL_${channelId}`, channel);

        // Emit event
        Helpers.emitEvent(ctx, 'ORG_REMOVED_FROM_CHANNEL', {
            channelId,
            orgId,
            orgMspId,
            reason,
            timestamp: channel.updatedAt
        });

        console.info(`Organization ${orgMspId} removed from channel ${channelId}`);
        return JSON.stringify(channel);
    }

    /**
     * Query channels using CouchDB rich query
     */
    static async QueryChannels(
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
        const channels = await Helpers.queryData<ChannelConfig>(ctx, queryString);

        console.info(`Found ${channels.length} channels`);
        return JSON.stringify(channels);
    }
}
