/**
 * Chaincode Proposal Interface
 * Represents a chaincode deployment proposal
 */

export enum ProposalStatus {
    DRAFT = 'DRAFT',           // Being prepared
    SUBMITTED = 'SUBMITTED',   // Awaiting approval
    APPROVED = 'APPROVED',     // Approved for deployment
    REJECTED = 'REJECTED',     // Rejected
    DEPLOYED = 'DEPLOYED'      // Successfully deployed
}

export interface Approval {
    orgId: string;              // Approving organization ID
    approvedBy: string;         // Approver MSP ID
    approvedAt: string;         // Approval timestamp
    signature: string;          // Digital signature (TX ID)
    comments?: string;          // Optional comments
}

export interface ChaincodeProposal {
    // ===== Identity =====
    proposalId: string;         // Unique proposal ID
    chaincodeName: string;      // Chaincode name
    version: string;            // Version (e.g., "1.0.0")

    // ===== Proposer =====
    proposedBy: string;         // Organization MSP ID
    proposedAt: string;         // Proposal timestamp (ISO 8601)

    // ===== Details =====
    description: string;        // What does this chaincode do?
    language: string;           // go, javascript, typescript
    sourceCodeHash: string;     // SHA256 hash of source code
    packageId: string;          // Fabric package ID (after packaging)

    // ===== Approval Workflow =====
    status: ProposalStatus;     // Current status
    approvals: Approval[];      // List of approvals
    requiredApprovals: number;  // How many approvals needed

    // ===== Deployment Configuration =====
    targetChannels: string[];   // Which channels to deploy to
    endorsementPolicy: string;  // Endorsement policy definition

    // ===== Security & Compliance =====
    securityAudit: boolean;     // Has passed security audit?
    auditReport?: string;       // Hash of audit report (IPFS/storage)

    // ===== Metadata =====
    createdAt: string;          // Creation timestamp
    updatedAt: string;          // Last update timestamp
}
