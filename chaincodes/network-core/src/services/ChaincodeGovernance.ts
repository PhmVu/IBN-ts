/**
 * Chaincode Governance Functions
 * Handles chaincode proposal lifecycle: Submit, Approve, Reject, Deploy, Query
 */

import { Context } from 'fabric-contract-api';
import { ChaincodeProposal, ProposalStatus, Approval, Organization, OrgStatus } from '../interfaces';
import { ChaincodeProposalValidator } from '../validators/Validators';
import { Helpers } from '../utils/Helpers';

export class ChaincodeGovernance {
    /**
     * Submit a new chaincode proposal
     * Only APPROVED organizations can submit
     */
    static async SubmitChaincodeProposal(
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
        // Get caller's organization
        const callerMspId = Helpers.getCallerMspId(ctx);

        // Verify caller is an APPROVED organization
        const callerOrg = await Helpers.getData<Organization>(ctx, callerMspId.replace('MSP', ''));
        if (callerOrg.status !== OrgStatus.APPROVED) {
            throw new Error(`Only APPROVED organizations can submit proposals. Current status: ${callerOrg.status}`);
        }

        // Parse target channels
        const targetChannels = Helpers.parseJSON<string[]>(targetChannelsJSON);

        // Generate unique proposal ID
        const proposalId = Helpers.generateId(`${chaincodeName}-${version}`);
        const timestamp = Helpers.getCurrentTimestamp();

        // Create proposal object
        const proposal: ChaincodeProposal = {
            proposalId,
            chaincodeName,
            version,
            proposedBy: callerMspId,
            proposedAt: timestamp,
            description,
            language,
            sourceCodeHash,
            packageId: '', // Will be set after packaging
            status: ProposalStatus.SUBMITTED,
            approvals: [],
            requiredApprovals: 1, // Default: 1 SuperAdmin approval
            targetChannels,
            endorsementPolicy,
            securityAudit,
            auditReport,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Validate proposal
        ChaincodeProposalValidator.validate(proposal);

        // Check for duplicate proposal (same chaincode + version)
        const duplicateKey = `PROPOSAL_${chaincodeName}_${version}`;
        const duplicateExists = await Helpers.exists(ctx, duplicateKey);
        if (duplicateExists) {
            throw new Error(`Proposal for ${chaincodeName} version ${version} already exists`);
        }

        // Save to ledger with two keys:
        // 1. By proposalId (for direct lookup)
        await Helpers.putData(ctx, proposalId, proposal);
        // 2. By chaincode+version (for duplicate check)
        await Helpers.putData(ctx, duplicateKey, { proposalId });

        // Emit event
        Helpers.emitEvent(ctx, 'CHAINCODE_PROPOSED', {
            proposalId,
            chaincodeName,
            version,
            proposedBy: callerMspId,
            timestamp
        });

        console.info(`Chaincode proposal ${proposalId} submitted by ${callerMspId}`);
        return JSON.stringify(proposal);
    }

    /**
     * Approve a chaincode proposal (SuperAdmin only)
     */
    static async ApproveChaincodeProposal(
        ctx: Context,
        proposalId: string,
        comments?: string
    ): Promise<string> {
        // Only SuperAdmin can approve
        Helpers.requireSuperAdmin(ctx);

        // Get proposal
        const proposal = await Helpers.getData<ChaincodeProposal>(ctx, proposalId);

        // Validate current status
        if (proposal.status !== ProposalStatus.SUBMITTED) {
            throw new Error(`Cannot approve proposal with status: ${proposal.status}`);
        }

        // Get approver info
        const approvedBy = Helpers.getCallerMspId(ctx);
        const timestamp = Helpers.getCurrentTimestamp();
        const txId = Helpers.getTransactionId(ctx);

        // Create approval record
        const approval: Approval = {
            orgId: 'IBN',
            approvedBy,
            approvedAt: timestamp,
            signature: txId,
            comments
        };

        // Add approval to list
        proposal.approvals.push(approval);

        // Check if enough approvals
        if (proposal.approvals.length >= proposal.requiredApprovals) {
            proposal.status = ProposalStatus.APPROVED;
        }

        proposal.updatedAt = timestamp;

        // Save to ledger
        await Helpers.putData(ctx, proposalId, proposal);

        // Emit event
        Helpers.emitEvent(ctx, 'CHAINCODE_APPROVED', {
            proposalId,
            chaincodeName: proposal.chaincodeName,
            version: proposal.version,
            approvedBy,
            timestamp,
            status: proposal.status
        });

        console.info(`Chaincode proposal ${proposalId} approved by ${approvedBy}`);
        return JSON.stringify(proposal);
    }

    /**
     * Reject a chaincode proposal (SuperAdmin only)
     */
    static async RejectChaincodeProposal(
        ctx: Context,
        proposalId: string,
        reason: string
    ): Promise<string> {
        // Only SuperAdmin can reject
        Helpers.requireSuperAdmin(ctx);

        // Validate reason
        if (!reason || reason.trim().length === 0) {
            throw new Error('Rejection reason is required');
        }

        // Get proposal
        const proposal = await Helpers.getData<ChaincodeProposal>(ctx, proposalId);

        // Validate current status
        if (proposal.status !== ProposalStatus.SUBMITTED) {
            throw new Error(`Cannot reject proposal with status: ${proposal.status}`);
        }

        // Get rejector info
        const rejectedBy = Helpers.getCallerMspId(ctx);
        const timestamp = Helpers.getCurrentTimestamp();

        // Update proposal
        proposal.status = ProposalStatus.REJECTED;
        proposal.updatedAt = timestamp;

        // Add rejection info to metadata (using any type for flexibility)
        if (!proposal.auditReport) {
            proposal.auditReport = '';
        }

        // Store rejection info in a comment field
        const rejectionInfo = {
            rejectedBy,
            rejectedAt: timestamp,
            reason
        };

        // Add to approvals as a rejection record
        proposal.approvals.push({
            orgId: 'IBN',
            approvedBy: rejectedBy,
            approvedAt: timestamp,
            signature: Helpers.getTransactionId(ctx),
            comments: `REJECTED: ${reason}`
        });

        // Save to ledger
        await Helpers.putData(ctx, proposalId, proposal);

        // Emit event
        Helpers.emitEvent(ctx, 'CHAINCODE_REJECTED', {
            proposalId,
            chaincodeName: proposal.chaincodeName,
            version: proposal.version,
            rejectedBy,
            timestamp,
            reason
        });

        console.info(`Chaincode proposal ${proposalId} rejected by ${rejectedBy}`);
        return JSON.stringify(proposal);
    }

    /**
     * Query chaincode proposals using CouchDB rich query
     */
    static async QueryChaincodeProposals(
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
        const proposals = await Helpers.queryData<ChaincodeProposal>(ctx, queryString);

        console.info(`Found ${proposals.length} chaincode proposals`);
        return JSON.stringify(proposals);
    }

    /**
     * Record chaincode deployment (SuperAdmin only)
     * Called after chaincode is actually deployed to Fabric network
     */
    static async RecordChaincodeDeployment(
        ctx: Context,
        proposalId: string,
        packageId: string,
        deployedChannelsJSON: string
    ): Promise<string> {
        // Only SuperAdmin can record deployment
        Helpers.requireSuperAdmin(ctx);

        // Get proposal
        const proposal = await Helpers.getData<ChaincodeProposal>(ctx, proposalId);

        // Validate current status
        if (proposal.status !== ProposalStatus.APPROVED) {
            throw new Error(`Cannot deploy proposal with status: ${proposal.status}. Must be APPROVED first.`);
        }

        // Parse deployed channels
        const deployedChannels = Helpers.parseJSON<string[]>(deployedChannelsJSON);

        // Get deployer info
        const deployedBy = Helpers.getCallerMspId(ctx);
        const timestamp = Helpers.getCurrentTimestamp();

        // Update proposal
        proposal.status = ProposalStatus.DEPLOYED;
        proposal.packageId = packageId;
        proposal.targetChannels = deployedChannels; // Update with actual deployed channels
        proposal.updatedAt = timestamp;

        // Save to ledger
        await Helpers.putData(ctx, proposalId, proposal);

        // Emit event
        Helpers.emitEvent(ctx, 'CHAINCODE_DEPLOYED', {
            proposalId,
            chaincodeName: proposal.chaincodeName,
            version: proposal.version,
            packageId,
            deployedChannels,
            deployedBy,
            timestamp
        });

        console.info(`Chaincode ${proposal.chaincodeName} v${proposal.version} deployed`);
        return JSON.stringify(proposal);
    }

    /**
     * Get chaincode history (all versions)
     * Returns all proposals for a specific chaincode name, sorted by version
     */
    static async GetChaincodeHistory(
        ctx: Context,
        chaincodeName: string
    ): Promise<string> {
        // Query all proposals for this chaincode
        const query = {
            chaincodeName: chaincodeName
        };

        const queryString = JSON.stringify({
            selector: query,
            sort: [{ version: 'desc' }]
        });

        // Execute query
        const proposals = await Helpers.queryData<ChaincodeProposal>(ctx, queryString);

        console.info(`Found ${proposals.length} versions of chaincode ${chaincodeName}`);
        return JSON.stringify(proposals);
    }
}
