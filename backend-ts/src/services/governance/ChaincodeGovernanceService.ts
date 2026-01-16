/**
 * Chaincode Governance Service
 */

import { Contract } from 'fabric-network';
// TODO: Enable when database is configured
// import { db } from '../../database/knex-config';
import {
    SubmitChaincodeProposalDTO,
    ApproveChaincodeProposalDTO,
    RejectChaincodeProposalDTO,
    RecordChaincodeDeploymentDTO,
    QueryChaincodeProposalsDTO,
    ChaincodeProposalResponseDTO
} from '../../models/governance/ChaincodeGovernanceDTO';

export class ChaincodeGovernanceService {
    private contract: Contract;

    constructor(contract: Contract) {
        this.contract = contract;
    }

    async submitProposal(dto: SubmitChaincodeProposalDTO): Promise<ChaincodeProposalResponseDTO> {
        const result = await this.contract.submitTransaction(
            'SubmitChaincodeProposal',
            dto.chaincodeName,
            dto.version,
            dto.description,
            dto.language,
            dto.sourceCodeHash,
            JSON.stringify(dto.targetChannels),
            dto.endorsementPolicy,
            dto.securityAudit.toString(),
            dto.auditReport || ''
        );
        const proposal = JSON.parse(result.toString());
        // TODO: Cache when database is ready
        // await this.cacheProposal(proposal);
        return proposal;
    }

    async approveProposal(dto: ApproveChaincodeProposalDTO): Promise<ChaincodeProposalResponseDTO> {
        const result = await this.contract.submitTransaction(
            'ApproveChaincodeProposal',
            dto.proposalId,
            dto.comments || ''
        );
        const proposal = JSON.parse(result.toString());
        // TODO: Cache when database is ready
        // await this.cacheProposal(proposal);
        return proposal;
    }

    async rejectProposal(dto: RejectChaincodeProposalDTO): Promise<ChaincodeProposalResponseDTO> {
        const result = await this.contract.submitTransaction(
            'RejectChaincodeProposal',
            dto.proposalId,
            dto.reason
        );
        const proposal = JSON.parse(result.toString());
        // TODO: Cache when database is ready
        // await this.cacheProposal(proposal);
        return proposal;
    }

    async recordDeployment(dto: RecordChaincodeDeploymentDTO): Promise<ChaincodeProposalResponseDTO> {
        const result = await this.contract.submitTransaction(
            'RecordChaincodeDeployment',
            dto.proposalId,
            dto.packageId,
            JSON.stringify(dto.deployedChannels)
        );
        const proposal = JSON.parse(result.toString());
        // TODO: Cache when database is ready
        // await this.cacheProposal(proposal);
        return proposal;
    }

    async queryProposals(dto: QueryChaincodeProposalsDTO): Promise<ChaincodeProposalResponseDTO[]> {
        const query: any = {};
        if (dto.status) query.status = dto.status;
        if (dto.proposedBy) query.proposedBy = dto.proposedBy;
        if (dto.chaincodeName) query.chaincodeName = dto.chaincodeName;

        const result = await this.contract.evaluateTransaction(
            'QueryChaincodeProposals',
            JSON.stringify(query)
        );
        return JSON.parse(result.toString());
    }

    async getChaincodeHistory(chaincodeName: string): Promise<ChaincodeProposalResponseDTO[]> {
        const result = await this.contract.evaluateTransaction(
            'GetChaincodeHistory',
            chaincodeName
        );
        return JSON.parse(result.toString());
    }

    // TODO: Uncomment when database caching is implemented
    /*
    private async cacheProposal(proposal: any): Promise<void> {
        await db('chaincode_proposals')
            .insert({
                proposal_id: proposal.proposalId,
                chaincode_name: proposal.chaincodeName,
                version: proposal.version,
                proposed_by: proposal.proposedBy,
                proposed_at: proposal.proposedAt,
                description: proposal.description,
                language: proposal.language,
                source_code_hash: proposal.sourceCodeHash,
                package_id: proposal.packageId,
                status: proposal.status,
                approvals: JSON.stringify(proposal.approvals),
                required_approvals: proposal.requiredApprovals,
                target_channels: JSON.stringify(proposal.targetChannels),
                endorsement_policy: proposal.endorsementPolicy,
                security_audit: proposal.securityAudit,
                audit_report: proposal.auditReport,
                created_at: proposal.createdAt,
                updated_at: proposal.updatedAt
            })
            .onConflict('proposal_id')
            .merge();
    }
    */
}
