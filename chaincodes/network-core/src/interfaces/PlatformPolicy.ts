/**
 * Platform Policy Interface
 * Represents governance policies for the platform
 */

export enum PolicyType {
    ENDORSEMENT = 'ENDORSEMENT',         // Transaction endorsement
    LIFECYCLE = 'LIFECYCLE',             // Chaincode lifecycle
    ACCESS_CONTROL = 'ACCESS_CONTROL',   // Access control
    COMPLIANCE = 'COMPLIANCE'            // Compliance rules
}

export interface PolicyRule {
    ruleId: string;             // Unique rule ID
    condition: string;          // Condition expression
    action: string;             // Action to take
    priority: number;           // Rule priority (higher = first)
}

export interface PlatformPolicy {
    // ===== Identity =====
    policyId: string;           // Unique policy ID
    policyName: string;         // Display name
    policyType: PolicyType;     // Type of policy

    // ===== Definition =====
    rules: PolicyRule[];        // List of rules

    // ===== Scope =====
    appliesTo: string[];        // Which orgs/channels this applies to

    // ===== Status =====
    isActive: boolean;          // Is this policy active?
    version: string;            // Policy version

    // ===== Metadata =====
    createdBy: string;          // Creator MSP ID
    createdAt: string;          // Creation timestamp
    updatedAt: string;          // Last update timestamp
}
