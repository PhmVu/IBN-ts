/**
 * Governance Index - Export all services and routes
 */

export { OrganizationService } from './OrganizationService';
export { ChaincodeGovernanceService } from './ChaincodeGovernanceService';

// Channel Management Service
import { Contract } from 'fabric-network';

export class ChannelManagementService {
    private contract: Contract;
    constructor(contract: Contract) { this.contract = contract; }

    async createChannel(dto: any) {
        const result = await this.contract.submitTransaction(
            'CreateChannelProposal', dto.channelId, dto.channelName,
            JSON.stringify(dto.organizations), JSON.stringify(dto.orderers),
            dto.endorsementPolicy, dto.lifecyclePolicy, dto.blockSize, dto.batchTimeout
        );
        return JSON.parse(result.toString());
    }

    async addOrganization(channelId: string, orgId: string) {
        const result = await this.contract.submitTransaction('AddOrganizationToChannel', channelId, orgId);
        return JSON.parse(result.toString());
    }

    async removeOrganization(channelId: string, orgId: string, reason: string) {
        const result = await this.contract.submitTransaction('RemoveOrganizationFromChannel', channelId, orgId, reason);
        return JSON.parse(result.toString());
    }

    async queryChannels(query: any) {
        const result = await this.contract.evaluateTransaction('QueryChannels', JSON.stringify(query));
        return JSON.parse(result.toString());
    }
}

// Policy Service
export class PolicyService {
    private contract: Contract;
    constructor(contract: Contract) { this.contract = contract; }

    async createPolicy(dto: any) {
        const result = await this.contract.submitTransaction(
            'CreatePolicy', dto.policyId, dto.policyName, dto.policyType,
            JSON.stringify(dto.rules), JSON.stringify(dto.appliesTo), dto.version
        );
        return JSON.parse(result.toString());
    }

    async updatePolicy(policyId: string, dto: any) {
        const result = await this.contract.submitTransaction(
            'UpdatePolicy', policyId,
            dto.rules ? JSON.stringify(dto.rules) : '',
            dto.appliesTo ? JSON.stringify(dto.appliesTo) : '',
            dto.isActive
        );
        return JSON.parse(result.toString());
    }

    async queryPolicies(query: any) {
        const result = await this.contract.evaluateTransaction('QueryPolicies', JSON.stringify(query));
        return JSON.parse(result.toString());
    }
}

// Audit Service
export class AuditService {
    private contract: Contract;
    constructor(contract: Contract) { this.contract = contract; }

    async queryAuditTrail(query: any) {
        const result = await this.contract.evaluateTransaction('QueryAuditTrail', JSON.stringify(query));
        return JSON.parse(result.toString());
    }

    async generateComplianceReport(startDate: string, endDate: string, reportType: string) {
        const result = await this.contract.evaluateTransaction(
            'GenerateComplianceReport', startDate, endDate, reportType
        );
        return JSON.parse(result.toString());
    }

    async getPlatformStatistics() {
        const result = await this.contract.evaluateTransaction('GetPlatformStatistics');
        return JSON.parse(result.toString());
    }
}
