/**
 * Chaincode Governance DTOs
 */

export interface SubmitChaincodeProposalDTO {
    chaincodeName: string;
    version: string;
    description: string;
    language: string;
    sourceCodeHash: string;
    targetChannels: string[];
    endorsementPolicy: string;
    securityAudit: boolean;
    auditReport?: string;
}

export interface ApproveChaincodeProposalDTO {
    proposalId: string;
    comments?: string;
}

export interface RejectChaincodeProposalDTO {
    proposalId: string;
    reason: string;
}

export interface RecordChaincodeDeploymentDTO {
    proposalId: string;
    packageId: string;
    deployedChannels: string[];
}

export interface QueryChaincodeProposalsDTO {
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DEPLOYED';
    proposedBy?: string;
    chaincodeName?: string;
    limit?: number;
    offset?: number;
}

export interface ChaincodeProposalResponseDTO {
    proposalId: string;
    chaincodeName: string;
    version: string;
    proposedBy: string;
    proposedAt: string;
    description: string;
    language: string;
    sourceCodeHash: string;
    packageId: string;
    status: string;
    approvals: any[];
    requiredApprovals: number;
    targetChannels: string[];
    endorsementPolicy: string;
    securityAudit: boolean;
    auditReport?: string;
    createdAt: string;
    updatedAt: string;
}
