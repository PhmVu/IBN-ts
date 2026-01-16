/**
 * Organization DTOs
 * Data Transfer Objects for Organization Management
 */

export interface RegisterOrganizationDTO {
    orgId: string;
    mspId: string;
    name: string;
    domain: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    businessLicense: string;
    taxId: string;
    certifications: string[];
    caUrl: string;
    peerEndpoints: string[];
    metadata?: Record<string, any>;
}

export interface ApproveOrganizationDTO {
    orgId: string;
    comments?: string;
}

export interface SuspendOrganizationDTO {
    orgId: string;
    reason: string;
}

export interface RevokeOrganizationDTO {
    orgId: string;
    reason: string;
}

export interface QueryOrganizationsDTO {
    status?: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REVOKED';
    mspId?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface OrganizationResponseDTO {
    orgId: string;
    mspId: string;
    name: string;
    domain: string;
    status: string;
    registeredBy: string;
    registeredAt: string;
    approvedBy?: string;
    approvedAt?: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    businessLicense: string;
    taxId: string;
    certifications: string[];
    caUrl: string;
    peerEndpoints: string[];
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
