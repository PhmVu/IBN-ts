import { Knex } from 'knex';

/**
 * Migration: Create governance tables for v0.0.3
 * Tables: organizations, chaincode_proposals, channel_configs, platform_policies, audit_events_cache
 */

export async function up(knex: Knex): Promise<void> {
    // 1. Organizations table (cache from blockchain)
    const hasOrganizations = await knex.schema.hasTable('organizations');
    if (!hasOrganizations) {
        await knex.schema.createTable('organizations', (table) => {
            table.string('org_id', 50).primary();
            table.string('msp_id', 50).notNullable().unique();
            table.string('name', 255).notNullable();
            table.string('domain', 255).notNullable();

            table.string('registered_by', 50).notNullable();
            table.timestamp('registered_at').notNullable();

            table.enum('status', ['PENDING', 'APPROVED', 'SUSPENDED', 'REVOKED']).notNullable();
            table.string('approved_by', 50);
            table.timestamp('approved_at');

            table.string('contact_email', 255).notNullable();
            table.string('contact_phone', 50).notNullable();
            table.text('address').notNullable();

            table.string('business_license', 100).notNullable();
            table.string('tax_id', 100).notNullable();
            table.json('certifications');

            table.string('ca_url', 255).notNullable();
            table.json('peer_endpoints');

            table.json('metadata');
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').notNullable();

            table.index(['status']);
            table.index(['msp_id']);
            table.index(['created_at']);
        });
    }

    // 2. Chaincode Proposals table (cache from blockchain)
    const hasProposals = await knex.schema.hasTable('chaincode_proposals');
    if (!hasProposals) {
        await knex.schema.createTable('chaincode_proposals', (table) => {
            table.string('proposal_id', 100).primary();
            table.string('chaincode_name', 50).notNullable();
            table.string('version', 20).notNullable();

            table.string('proposed_by', 50).notNullable();
            table.timestamp('proposed_at').notNullable();

            table.text('description').notNullable();
            table.string('language', 20).notNullable();
            table.string('source_code_hash', 64).notNullable();
            table.string('package_id', 100);

            table.enum('status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DEPLOYED']).notNullable();
            table.json('approvals');
            table.integer('required_approvals').notNullable();

            table.json('target_channels');
            table.text('endorsement_policy').notNullable();

            table.boolean('security_audit').notNullable();
            table.string('audit_report', 255);

            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').notNullable();

            table.index(['status']);
            table.index(['proposed_by']);
            table.index(['chaincode_name', 'version']);
            table.index(['created_at']);
        });
    }

    // 3. Channel Configs table (cache from blockchain)
    const hasChannels = await knex.schema.hasTable('channel_configs');
    if (!hasChannels) {
        await knex.schema.createTable('channel_configs', (table) => {
            table.string('channel_id', 50).primary();
            table.string('channel_name', 255).notNullable();

            table.json('organizations').notNullable();
            table.json('orderers').notNullable();

            table.text('endorsement_policy').notNullable();
            table.text('lifecycle_policy').notNullable();

            table.integer('block_size').notNullable();
            table.integer('batch_timeout').notNullable();

            table.enum('status', ['ACTIVE', 'INACTIVE', 'ARCHIVED']).notNullable();
            table.string('created_by', 50).notNullable();
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').notNullable();

            table.index(['status']);
            table.index(['created_at']);
        });
    }

    // 4. Platform Policies table (cache from blockchain)
    const hasPolicies = await knex.schema.hasTable('platform_policies');
    if (!hasPolicies) {
        await knex.schema.createTable('platform_policies', (table) => {
            table.string('policy_id', 100).primary();
            table.string('policy_name', 255).notNullable();
            table.enum('policy_type', ['ENDORSEMENT', 'LIFECYCLE', 'ACCESS_CONTROL', 'COMPLIANCE']).notNullable();

            table.json('rules').notNullable();
            table.json('applies_to').notNullable();

            table.boolean('is_active').notNullable();
            table.string('version', 20).notNullable();

            table.string('created_by', 50).notNullable();
            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').notNullable();

            table.index(['policy_type']);
            table.index(['is_active']);
            table.index(['created_at']);
        });
    }

    // 5. Audit Events Cache table (cache from blockchain)
    const hasAudit = await knex.schema.hasTable('audit_events_cache');
    if (!hasAudit) {
        await knex.schema.createTable('audit_events_cache', (table) => {
            table.string('event_id', 100).primary();
            table.string('event_type', 50).notNullable();

            table.string('actor', 50).notNullable();
            table.string('actor_role', 50).notNullable();

            table.string('action', 255).notNullable();
            table.string('resource', 100).notNullable();
            table.string('resource_id', 100).notNullable();

            table.enum('status', ['SUCCESS', 'FAILURE']).notNullable();
            table.text('error_message');

            table.string('ip_address', 50);
            table.string('user_agent', 255);

            table.json('before_state');
            table.json('after_state');

            table.timestamp('timestamp').notNullable();
            table.string('tx_id', 100).notNullable();

            table.index(['event_type']);
            table.index(['actor']);
            table.index(['resource']);
            table.index(['status']);
            table.index(['timestamp']);
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('audit_events_cache');
    await knex.schema.dropTableIfExists('platform_policies');
    await knex.schema.dropTableIfExists('channel_configs');
    await knex.schema.dropTableIfExists('chaincode_proposals');
    await knex.schema.dropTableIfExists('organizations');
}
