/**
 * Organization Service
 * Handles organization management operations with NetworkCore chaincode
 */

import { Contract } from 'fabric-network';
// TODO: Enable when database is configured
// import { db } from '../../database/knex-config';
import {
    RegisterOrganizationDTO,
    ApproveOrganizationDTO,
    SuspendOrganizationDTO,
    RevokeOrganizationDTO,
    QueryOrganizationsDTO,
    OrganizationResponseDTO
} from '../../models/governance/OrganizationDTO';

export class OrganizationService {
    private contract: Contract;

    constructor(contract: Contract) {
        this.contract = contract;
    }

    /**
     * Register a new organization
     */
    async registerOrganization(dto: RegisterOrganizationDTO): Promise<OrganizationResponseDTO> {
        try {
            // Call chaincode
            const result = await this.contract.submitTransaction(
                'RegisterOrganization',
                dto.orgId,
                dto.mspId,
                dto.name,
                dto.domain,
                dto.contactEmail,
                dto.contactPhone,
                dto.address,
                dto.businessLicense,
                dto.taxId,
                JSON.stringify(dto.certifications),
                dto.caUrl,
                JSON.stringify(dto.peerEndpoints),
                JSON.stringify(dto.metadata || {})
            );

            const organization = JSON.parse(result.toString());

            // TODO: Cache to database when knex-config is implemented
            // await this.cacheOrganization(organization);

            return organization;
        } catch (error: any) {
            throw new Error(`Failed to register organization: ${error.message}`);
        }
    }

    /**
     * Approve an organization (SuperAdmin only)
     */
    async approveOrganization(dto: ApproveOrganizationDTO): Promise<OrganizationResponseDTO> {
        try {
            // Call chaincode
            const result = await this.contract.submitTransaction(
                'ApproveOrganization',
                dto.orgId,
                dto.comments || ''
            );

            const organization = JSON.parse(result.toString());

            // TODO: Update cache
            // await this.cacheOrganization(organization);

            return organization;
        } catch (error: any) {
            throw new Error(`Failed to approve organization: ${error.message}`);
        }
    }

    /**
     * Suspend an organization (SuperAdmin only)
     */
    async suspendOrganization(dto: SuspendOrganizationDTO): Promise<OrganizationResponseDTO> {
        try {
            // Call chaincode
            const result = await this.contract.submitTransaction(
                'SuspendOrganization',
                dto.orgId,
                dto.reason
            );

            const organization = JSON.parse(result.toString());

            // TODO: Update cache
            // await this.cacheOrganization(organization);

            return organization;
        } catch (error: any) {
            throw new Error(`Failed to suspend organization: ${error.message}`);
        }
    }

    /**
     * Revoke an organization (SuperAdmin only)
     */
    async revokeOrganization(dto: RevokeOrganizationDTO): Promise<OrganizationResponseDTO> {
        try {
            // Call chaincode
            const result = await this.contract.submitTransaction(
                'RevokeOrganization',
                dto.orgId,
                dto.reason
            );

            const organization = JSON.parse(result.toString());

            // TODO: Update cache
            // await this.cacheOrganization(organization);

            return organization;
        } catch (error: any) {
            throw new Error(`Failed to revoke organization: ${error.message}`);
        }
    }

    /**
     * Query organizations
     */
    async queryOrganizations(dto: QueryOrganizationsDTO): Promise<OrganizationResponseDTO[]> {
        try {
            // Build query
            const query: any = {};
            if (dto.status) query.status = dto.status;
            if (dto.mspId) query.mspId = dto.mspId;
            if (dto.name) query.name = { $regex: dto.name };

            // TODO: Query from cache first when database is ready
            // let organizations = await this.queryFromCache(dto);
            let organizations: OrganizationResponseDTO[] = [];

            // If cache is empty, query from blockchain
            if (organizations.length === 0) {
                const result = await this.contract.evaluateTransaction(
                    'QueryOrganizations',
                    JSON.stringify(query)
                );

                organizations = JSON.parse(result.toString());

                // TODO: Update cache
                // for (const org of organizations) {
                //     await this.cacheOrganization(org);
                // }
            }

            return organizations;
        } catch (error: any) {
            throw new Error(`Failed to query organizations: ${error.message}`);
        }
    }

    /**
     * Get organization by ID
     */
    async getOrganizationById(orgId: string): Promise<OrganizationResponseDTO | null> {
        try {
            // TODO: Try cache first when database is ready
            // const cached = await db('organizations').where({ org_id: orgId }).first();
            // if (cached) {
            //     return this.mapFromDB(cached);
            // }

            // Query from blockchain
            const query = { orgId };
            const result = await this.contract.evaluateTransaction(
                'QueryOrganizations',
                JSON.stringify(query)
            );

            const organizations = JSON.parse(result.toString());
            if (organizations.length > 0) {
                const org = organizations[0];
                // TODO: Cache result
                // await this.cacheOrganization(org);
                return org;
            }

            return null;
        } catch (error: any) {
            throw new Error(`Failed to get organization: ${error.message}`);
        }
    }


    // TODO: Uncomment when database caching is implemented
    /*
    private async cacheOrganization(org: any): Promise<void> {
        const data = {
            org_id: org.orgId,
            msp_id: org.mspId,
            name: org.name,
            domain: org.domain,
            registered_by: org.registeredBy,
            registered_at: org.registeredAt,
            status: org.status,
            approved_by: org.approvedBy,
            approved_at: org.approvedAt,
            contact_email: org.contactEmail,
            contact_phone: org.contactPhone,
            address: org.address,
            business_license: org.businessLicense,
            tax_id: org.taxId,
            certifications: JSON.stringify(org.certifications),
            ca_url: org.caUrl,
            peer_endpoints: JSON.stringify(org.peerEndpoints),
            metadata: JSON.stringify(org.metadata),
            created_at: org.createdAt,
            updated_at: org.updatedAt
        };

        await db('organizations')
            .insert(data)
            .onConflict('org_id')
            .merge();
    }

    private async queryFromCache(dto: QueryOrganizationsDTO): Promise<OrganizationResponseDTO[]> {
        let query = db('organizations');
        if (dto.status) query = query.where({ status: dto.status });
        if (dto.mspId) query = query.where({ msp_id: dto.mspId });
        if (dto.name) query = query.where('name', 'like', `%${dto.name}%`);
        if (dto.limit) query = query.limit(dto.limit);
        if (dto.offset) query = query.offset(dto.offset);
        const results = await query;
        return results.map(this.mapFromDB);
    }

    private mapFromDB(row: any): OrganizationResponseDTO {
        return {
            orgId: row.org_id,
            mspId: row.msp_id,
            name: row.name,
            domain: row.domain,
            status: row.status,
            registeredBy: row.registered_by,
            registeredAt: row.registered_at,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
            contactEmail: row.contact_email,
            contactPhone: row.contact_phone,
            address: row.address,
            businessLicense: row.business_license,
            taxId: row.tax_id,
            certifications: JSON.parse(row.certifications),
            caUrl: row.ca_url,
            peerEndpoints: JSON.parse(row.peer_endpoints),
            metadata: JSON.parse(row.metadata),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    */
}

