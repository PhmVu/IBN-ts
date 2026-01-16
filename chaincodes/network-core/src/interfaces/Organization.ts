/**
 * Organization Interface
 * Represents an organization in the blockchain network
 */

export enum OrgStatus {
    PENDING = 'PENDING',       // Awaiting approval
    APPROVED = 'APPROVED',     // Active member
    SUSPENDED = 'SUSPENDED',   // Temporarily suspended
    REVOKED = 'REVOKED'        // Permanently revoked
}

export interface Organization {
    // ===== Identity =====
    orgId: string;              // Unique ID (e.g., "ORG-001")
    mspId: string;              // MSP ID (e.g., "Org1MSP")
    name: string;               // Organization name
    domain: string;             // Domain (e.g., "org1.example.com")

    // ===== Registration =====
    registeredBy: string;       // Who registered this org (MSP ID)
    registeredAt: string;       // Registration timestamp (ISO 8601)

    // ===== Approval =====
    status: OrgStatus;          // Current status
    approvedBy?: string;        // Who approved (MSP ID)
    approvedAt?: string;        // Approval timestamp

    // ===== Contact Information =====
    contactEmail: string;       // Primary contact email
    contactPhone: string;       // Contact phone number
    address: string;            // Physical address

    // ===== Compliance =====
    businessLicense: string;    // Business license number
    taxId: string;              // Tax identification number
    certifications: string[];   // ISO, industry certifications

    // ===== Technical Configuration =====
    caUrl: string;              // Certificate Authority URL
    peerEndpoints: string[];    // Peer endpoints

    // ===== Metadata =====
    metadata: Record<string, any>; // Additional custom data
    createdAt: string;          // Creation timestamp
    updatedAt: string;          // Last update timestamp
}
