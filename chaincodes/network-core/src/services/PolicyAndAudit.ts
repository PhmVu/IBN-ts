/**
 * Policy & Audit Management Functions
 * Handles policy management and audit trail
 */

import { Context } from 'fabric-contract-api';
import { PlatformPolicy, PolicyType, AuditEvent, AuditEventType, EventStatus } from '../interfaces';
import { PlatformPolicyValidator, AuditEventValidator } from '../validators/Validators';
import { Helpers } from '../utils/Helpers';

export class PolicyAndAudit {
    /**
     * Create a new platform policy (SuperAdmin only)
     */
    static async CreatePolicy(
        ctx: Context,
        policyId: string,
        policyName: string,
        policyType: PolicyType,
        rulesJSON: string,
        appliesToJSON: string,
        version: string
    ): Promise<string> {
        // Only SuperAdmin can create policies
        Helpers.requireSuperAdmin(ctx);

        // Check if policy already exists
        const exists = await Helpers.exists(ctx, `POLICY_${policyId}`);
        if (exists) {
            throw new Error(`Policy ${policyId} already exists`);
        }

        // Parse JSON inputs
        const rules = Helpers.parseJSON<any[]>(rulesJSON);
        const appliesTo = Helpers.parseJSON<string[]>(appliesToJSON);

        // Get creator info
        const createdBy = Helpers.getCallerMspId(ctx);
        const timestamp = Helpers.getCurrentTimestamp();

        // Create policy object
        const policy: PlatformPolicy = {
            policyId,
            policyName,
            policyType,
            rules,
            appliesTo,
            isActive: true,
            version,
            createdBy,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Validate policy
        PlatformPolicyValidator.validate(policy);

        // Save to ledger
        await Helpers.putData(ctx, `POLICY_${policyId}`, policy);

        // Emit event
        Helpers.emitEvent(ctx, 'POLICY_CREATED', {
            policyId,
            policyName,
            policyType,
            createdBy,
            timestamp
        });

        console.info(`Policy ${policyId} created by ${createdBy}`);
        return JSON.stringify(policy);
    }

    /**
     * Update an existing policy (SuperAdmin only)
     */
    static async UpdatePolicy(
        ctx: Context,
        policyId: string,
        rulesJSON?: string,
        appliesToJSON?: string,
        isActive?: boolean
    ): Promise<string> {
        // Only SuperAdmin can update policies
        Helpers.requireSuperAdmin(ctx);

        // Get existing policy
        const policy = await Helpers.getData<PlatformPolicy>(ctx, `POLICY_${policyId}`);

        // Update fields if provided
        if (rulesJSON) {
            policy.rules = Helpers.parseJSON<any[]>(rulesJSON);
        }
        if (appliesToJSON) {
            policy.appliesTo = Helpers.parseJSON<string[]>(appliesToJSON);
        }
        if (isActive !== undefined) {
            policy.isActive = isActive;
        }

        // Increment version
        const versionParts = policy.version.split('.');
        versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
        policy.version = versionParts.join('.');

        policy.updatedAt = Helpers.getCurrentTimestamp();

        // Validate updated policy
        PlatformPolicyValidator.validate(policy);

        // Save to ledger
        await Helpers.putData(ctx, `POLICY_${policyId}`, policy);

        // Emit event
        Helpers.emitEvent(ctx, 'POLICY_UPDATED', {
            policyId,
            version: policy.version,
            updatedBy: Helpers.getCallerMspId(ctx),
            timestamp: policy.updatedAt
        });

        console.info(`Policy ${policyId} updated to version ${policy.version}`);
        return JSON.stringify(policy);
    }

    /**
     * Query policies using CouchDB rich query
     */
    static async QueryPolicies(
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
        const policies = await Helpers.queryData<PlatformPolicy>(ctx, queryString);

        console.info(`Found ${policies.length} policies`);
        return JSON.stringify(policies);
    }

    /**
     * Record an audit event
     * This is called internally by other functions
     */
    static async RecordAuditEvent(
        ctx: Context,
        eventType: AuditEventType,
        action: string,
        resource: string,
        resourceId: string,
        status: EventStatus,
        beforeState?: any,
        afterState?: any,
        errorMessage?: string
    ): Promise<string> {
        // Generate unique event ID
        const eventId = Helpers.generateId('AUDIT');
        const timestamp = Helpers.getCurrentTimestamp();
        const txId = Helpers.getTransactionId(ctx);

        // Get actor info
        const actor = Helpers.getCallerMspId(ctx);
        const actorRole = Helpers.isSuperAdmin(ctx) ? 'SuperAdmin' : 'OrgAdmin';

        // Create audit event
        const auditEvent: AuditEvent = {
            eventId,
            eventType,
            actor,
            actorRole,
            action,
            resource,
            resourceId,
            status,
            errorMessage,
            beforeState,
            afterState,
            timestamp,
            txId
        };

        // Validate audit event
        AuditEventValidator.validate(auditEvent);

        // Save to ledger
        await Helpers.putData(ctx, eventId, auditEvent);

        console.info(`Audit event ${eventId} recorded`);
        return JSON.stringify(auditEvent);
    }

    /**
     * Query audit trail using CouchDB rich query
     */
    static async QueryAuditTrail(
        ctx: Context,
        queryJSON: string
    ): Promise<string> {
        // Parse query
        const query = Helpers.parseJSON<any>(queryJSON);

        // Build CouchDB query with sorting by timestamp
        const queryString = JSON.stringify({
            selector: query,
            sort: [{ timestamp: 'desc' }]
        });

        // Execute query
        const events = await Helpers.queryData<AuditEvent>(ctx, queryString);

        console.info(`Found ${events.length} audit events`);
        return JSON.stringify(events);
    }

    /**
     * Generate compliance report (SuperAdmin only)
     * Returns statistics and summary for a given time period
     */
    static async GenerateComplianceReport(
        ctx: Context,
        startDate: string,
        endDate: string,
        reportType: string
    ): Promise<string> {
        // Only SuperAdmin can generate reports
        Helpers.requireSuperAdmin(ctx);

        // Query audit events in date range
        const query = {
            timestamp: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const queryString = JSON.stringify({
            selector: query,
            sort: [{ timestamp: 'desc' }]
        });

        const events = await Helpers.queryData<AuditEvent>(ctx, queryString);

        // Generate statistics
        const report = {
            reportType,
            period: {
                startDate,
                endDate
            },
            generatedAt: Helpers.getCurrentTimestamp(),
            generatedBy: Helpers.getCallerMspId(ctx),
            statistics: {
                totalEvents: events.length,
                successfulEvents: events.filter(e => e.status === EventStatus.SUCCESS).length,
                failedEvents: events.filter(e => e.status === EventStatus.FAILURE).length,
                eventsByType: this.groupByEventType(events),
                eventsByActor: this.groupByActor(events)
            },
            events: events.slice(0, 100) // Include first 100 events
        };

        console.info(`Compliance report generated for ${startDate} to ${endDate}`);
        return JSON.stringify(report);
    }

    /**
     * Helper: Group events by type
     */
    private static groupByEventType(events: AuditEvent[]): Record<string, number> {
        const grouped: Record<string, number> = {};
        for (const event of events) {
            grouped[event.eventType] = (grouped[event.eventType] || 0) + 1;
        }
        return grouped;
    }

    /**
     * Helper: Group events by actor
     */
    private static groupByActor(events: AuditEvent[]): Record<string, number> {
        const grouped: Record<string, number> = {};
        for (const event of events) {
            grouped[event.actor] = (grouped[event.actor] || 0) + 1;
        }
        return grouped;
    }
}
