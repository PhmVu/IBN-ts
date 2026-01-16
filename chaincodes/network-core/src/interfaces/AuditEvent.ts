/**
 * Audit Event Interface
 * Represents an audit event in the system
 */

export enum AuditEventType {
    // Organization Events
    ORG_REGISTERED = 'ORG_REGISTERED',
    ORG_APPROVED = 'ORG_APPROVED',
    ORG_SUSPENDED = 'ORG_SUSPENDED',
    ORG_REVOKED = 'ORG_REVOKED',

    // Chaincode Events
    CHAINCODE_PROPOSED = 'CHAINCODE_PROPOSED',
    CHAINCODE_APPROVED = 'CHAINCODE_APPROVED',
    CHAINCODE_REJECTED = 'CHAINCODE_REJECTED',
    CHAINCODE_DEPLOYED = 'CHAINCODE_DEPLOYED',

    // Channel Events
    CHANNEL_CREATED = 'CHANNEL_CREATED',
    CHANNEL_UPDATED = 'CHANNEL_UPDATED',

    // Policy Events
    POLICY_CREATED = 'POLICY_CREATED',
    POLICY_UPDATED = 'POLICY_UPDATED'
}

export enum EventStatus {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE'
}

export interface AuditEvent {
    // ===== Identity =====
    eventId: string;            // Unique event ID
    eventType: AuditEventType;  // Type of event

    // ===== Actor =====
    actor: string;              // Who did it (MSP ID)
    actorRole: string;          // Their role (SuperAdmin, OrgAdmin, User)

    // ===== Action =====
    action: string;             // What they did
    resource: string;           // What resource (Organization, Chaincode, etc.)
    resourceId: string;         // Resource ID

    // ===== Result =====
    status: EventStatus;        // SUCCESS or FAILURE
    errorMessage?: string;      // Error message if failed

    // ===== Context =====
    ipAddress?: string;         // IP address (if available)
    userAgent?: string;         // User agent (if available)

    // ===== Data =====
    beforeState?: any;          // State before action
    afterState?: any;           // State after action

    // ===== Timestamp =====
    timestamp: string;          // Event timestamp (ISO 8601)
    txId: string;               // Blockchain transaction ID
}
