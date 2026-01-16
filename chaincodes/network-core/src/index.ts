import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { OrganizationManagement } from './services/OrganizationManagement';
import { ChaincodeGovernance } from './services/ChaincodeGovernance';
import { ChannelManagement } from './services/ChannelManagement';
import { PolicyAndAudit } from './services/PolicyAndAudit';
import { Helpers } from './utils/Helpers';

@Info({ title: 'NetworkCore', description: 'Network Core Chaincode for IBN Platform Governance' })
export class NetworkCoreContract extends Contract {

    // ========================================
    // INITIALIZATION
    // ========================================

    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        console.info('Initializing NetworkCore ledger...');

        // Initialize IBN as the first organization (SuperAdmin)
        const ibnOrg = {
            orgId: 'IBN',
            mspId: 'IBNMSP',
            name: 'IBN Platform',
            domain: 'ibn.ictu.edu.vn',
            registeredBy: 'SYSTEM',
            registeredAt: new Date().toISOString(),
            status: 'APPROVED',
            approvedBy: 'SYSTEM',
            approvedAt: new Date().toISOString(),
            contactEmail: 'admin@ibn.ictu.edu.vn',
            contactPhone: '+84-xxx-xxx-xxx',
            address: 'ICTU, Hanoi, Vietnam',
            businessLicense: 'IBN-LICENSE-001',
            taxId: 'IBN-TAX-001',
            certifications: ['ISO27001', 'ISO9001'],
            caUrl: 'http://ca.ibn.ictu.edu.vn:7054',
            peerEndpoints: ['peer0.ibn.ictu.edu.vn:7051'],
            metadata: {
                role: 'SuperAdmin',
                description: 'Platform operator and governance authority'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await ctx.stub.putState('IBN', Buffer.from(JSON.stringify(ibnOrg)));
        console.info('IBN organization initialized as SuperAdmin');
    }

    // ========================================
    // ORGANIZATION MANAGEMENT (5 functions)
    // ========================================

    /**
     * Register a new organization
     * Anyone can register, but needs SuperAdmin approval
     */
    @Transaction()
    @Returns('string')
    public async RegisterOrganization(
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
        return await OrganizationManagement.RegisterOrganization(
            ctx,
            orgId,
            mspId,
            name,
            domain,
            contactEmail,
            contactPhone,
            address,
            businessLicense,
            taxId,
            certificationsJSON,
            caUrl,
            peerEndpointsJSON,
            metadataJSON
        );
    }

    /**
     * Approve an organization (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async ApproveOrganization(
        ctx: Context,
        orgId: string,
        comments?: string
    ): Promise<string> {
        return await OrganizationManagement.ApproveOrganization(ctx, orgId, comments);
    }

    /**
     * Suspend an organization (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async SuspendOrganization(
        ctx: Context,
        orgId: string,
        reason: string
    ): Promise<string> {
        return await OrganizationManagement.SuspendOrganization(ctx, orgId, reason);
    }

    /**
     * Revoke an organization permanently (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async RevokeOrganization(
        ctx: Context,
        orgId: string,
        reason: string
    ): Promise<string> {
        return await OrganizationManagement.RevokeOrganization(ctx, orgId, reason);
    }

    /**
     * Query organizations using CouchDB rich query
     */
    @Transaction(false)
    @Returns('string')
    public async QueryOrganizations(
        ctx: Context,
        queryJSON: string
    ): Promise<string> {
        return await OrganizationManagement.QueryOrganizations(ctx, queryJSON);
    }

    // ========================================
    // CHAINCODE GOVERNANCE (6 functions)
    // ========================================

    /**
     * Submit a new chaincode proposal
     * Only APPROVED organizations can submit
     */
    @Transaction()
    @Returns('string')
    public async SubmitChaincodeProposal(
        ctx: Context,
        chaincodeName: string,
        version: string,
        description: string,
        language: string,
        sourceCodeHash: string,
        targetChannelsJSON: string,
        endorsementPolicy: string,
        securityAudit: boolean,
        auditReport?: string
    ): Promise<string> {
        return await ChaincodeGovernance.SubmitChaincodeProposal(
            ctx,
            chaincodeName,
            version,
            description,
            language,
            sourceCodeHash,
            targetChannelsJSON,
            endorsementPolicy,
            securityAudit,
            auditReport
        );
    }

    /**
     * Approve a chaincode proposal (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async ApproveChaincodeProposal(
        ctx: Context,
        proposalId: string,
        comments?: string
    ): Promise<string> {
        return await ChaincodeGovernance.ApproveChaincodeProposal(ctx, proposalId, comments);
    }

    /**
     * Reject a chaincode proposal (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async RejectChaincodeProposal(
        ctx: Context,
        proposalId: string,
        reason: string
    ): Promise<string> {
        return await ChaincodeGovernance.RejectChaincodeProposal(ctx, proposalId, reason);
    }

    /**
     * Query chaincode proposals
     */
    @Transaction(false)
    @Returns('string')
    public async QueryChaincodeProposals(
        ctx: Context,
        queryJSON: string
    ): Promise<string> {
        return await ChaincodeGovernance.QueryChaincodeProposals(ctx, queryJSON);
    }

    /**
     * Record chaincode deployment (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async RecordChaincodeDeployment(
        ctx: Context,
        proposalId: string,
        packageId: string,
        deployedChannelsJSON: string
    ): Promise<string> {
        return await ChaincodeGovernance.RecordChaincodeDeployment(ctx, proposalId, packageId, deployedChannelsJSON);
    }

    /**
     * Get chaincode history (all versions)
     */
    @Transaction(false)
    @Returns('string')
    public async GetChaincodeHistory(
        ctx: Context,
        chaincodeName: string
    ): Promise<string> {
        return await ChaincodeGovernance.GetChaincodeHistory(ctx, chaincodeName);
    }

    // ========================================
    // CHANNEL MANAGEMENT (5 functions)
    // ========================================

    /**
     * Create a new channel (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async CreateChannelProposal(
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
        return await ChannelManagement.CreateChannelProposal(
            ctx,
            channelId,
            channelName,
            organizationsJSON,
            orderersJSON,
            endorsementPolicy,
            lifecyclePolicy,
            blockSize,
            batchTimeout
        );
    }

    /**
     * Approve a channel proposal (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async ApproveChannelProposal(
        ctx: Context,
        channelId: string
    ): Promise<string> {
        return await ChannelManagement.ApproveChannelProposal(ctx, channelId);
    }

    /**
     * Add an organization to a channel (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async AddOrganizationToChannel(
        ctx: Context,
        channelId: string,
        orgId: string
    ): Promise<string> {
        return await ChannelManagement.AddOrganizationToChannel(ctx, channelId, orgId);
    }

    /**
     * Remove an organization from a channel (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async RemoveOrganizationFromChannel(
        ctx: Context,
        channelId: string,
        orgId: string,
        reason: string
    ): Promise<string> {
        return await ChannelManagement.RemoveOrganizationFromChannel(ctx, channelId, orgId, reason);
    }

    /**
     * Query channels
     */
    @Transaction(false)
    @Returns('string')
    public async QueryChannels(
        ctx: Context,
        queryJSON: string
    ): Promise<string> {
        return await ChannelManagement.QueryChannels(ctx, queryJSON);
    }

    // ========================================
    // POLICY & AUDIT MANAGEMENT (6 functions)
    // ========================================

    /**
     * Create a new platform policy (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async CreatePolicy(
        ctx: Context,
        policyId: string,
        policyName: string,
        policyType: string,
        rulesJSON: string,
        appliesToJSON: string,
        version: string
    ): Promise<string> {
        return await PolicyAndAudit.CreatePolicy(
            ctx,
            policyId,
            policyName,
            policyType as any,
            rulesJSON,
            appliesToJSON,
            version
        );
    }

    /**
     * Update an existing policy (SuperAdmin only)
     */
    @Transaction()
    @Returns('string')
    public async UpdatePolicy(
        ctx: Context,
        policyId: string,
        rulesJSON?: string,
        appliesToJSON?: string,
        isActive?: boolean
    ): Promise<string> {
        return await PolicyAndAudit.UpdatePolicy(ctx, policyId, rulesJSON, appliesToJSON, isActive);
    }

    /**
     * Query policies
     */
    @Transaction(false)
    @Returns('string')
    public async QueryPolicies(
        ctx: Context,
        queryJSON: string
    ): Promise<string> {
        return await PolicyAndAudit.QueryPolicies(ctx, queryJSON);
    }

    /**
     * Record an audit event
     */
    @Transaction()
    @Returns('string')
    public async RecordAuditEvent(
        ctx: Context,
        eventType: string,
        action: string,
        resource: string,
        resourceId: string,
        status: string,
        beforeStateJSON?: string,
        afterStateJSON?: string,
        errorMessage?: string
    ): Promise<string> {
        const beforeState = beforeStateJSON ? Helpers.parseJSON(beforeStateJSON) : undefined;
        const afterState = afterStateJSON ? Helpers.parseJSON(afterStateJSON) : undefined;

        return await PolicyAndAudit.RecordAuditEvent(
            ctx,
            eventType as any,
            action,
            resource,
            resourceId,
            status as any,
            beforeState,
            afterState,
            errorMessage
        );
    }

    /**
     * Query audit trail
     */
    @Transaction(false)
    @Returns('string')
    public async QueryAuditTrail(
        ctx: Context,
        queryJSON: string
    ): Promise<string> {
        return await PolicyAndAudit.QueryAuditTrail(ctx, queryJSON);
    }

    /**
     * Generate compliance report (SuperAdmin only)
     */
    @Transaction(false)
    @Returns('string')
    public async GenerateComplianceReport(
        ctx: Context,
        startDate: string,
        endDate: string,
        reportType: string
    ): Promise<string> {
        return await PolicyAndAudit.GenerateComplianceReport(ctx, startDate, endDate, reportType);
    }

    // ========================================
    // UTILITY FUNCTIONS (2 functions)
    // ========================================

    /**
     * Get platform statistics
     */
    @Transaction(false)
    @Returns('string')
    public async GetPlatformStatistics(ctx: Context): Promise<string> {
        // Query all organizations
        const orgsQuery = JSON.stringify({ selector: { mspId: { $exists: true } } });
        const orgs = await Helpers.queryData(ctx, orgsQuery);

        // Query all proposals
        const proposalsQuery = JSON.stringify({ selector: { proposalId: { $exists: true } } });
        const proposals = await Helpers.queryData(ctx, proposalsQuery);

        // Query all channels
        const channelsQuery = JSON.stringify({ selector: { channelId: { $exists: true } } });
        const channels = await Helpers.queryData(ctx, channelsQuery);

        // Query all policies
        const policiesQuery = JSON.stringify({ selector: { policyId: { $exists: true } } });
        const policies = await Helpers.queryData(ctx, policiesQuery);

        const stats = {
            timestamp: Helpers.getCurrentTimestamp(),
            organizations: {
                total: orgs.length,
                pending: orgs.filter((o: any) => o.status === 'PENDING').length,
                approved: orgs.filter((o: any) => o.status === 'APPROVED').length,
                suspended: orgs.filter((o: any) => o.status === 'SUSPENDED').length,
                revoked: orgs.filter((o: any) => o.status === 'REVOKED').length
            },
            chaincodes: {
                total: proposals.length,
                submitted: proposals.filter((p: any) => p.status === 'SUBMITTED').length,
                approved: proposals.filter((p: any) => p.status === 'APPROVED').length,
                rejected: proposals.filter((p: any) => p.status === 'REJECTED').length,
                deployed: proposals.filter((p: any) => p.status === 'DEPLOYED').length
            },
            channels: {
                total: channels.length,
                active: channels.filter((c: any) => c.status === 'ACTIVE').length
            },
            policies: {
                total: policies.length,
                active: policies.filter((p: any) => p.isActive === true).length
            }
        };

        return JSON.stringify(stats);
    }
}
