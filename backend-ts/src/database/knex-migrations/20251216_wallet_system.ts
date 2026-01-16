import { Knex } from 'knex';

/**
 * Phase 1: Wallet System Database Schema
 * 
 * Creates:
 * - wallets table (encrypted identity storage)
 * - certificate_revocations table (CRL)
 * - jwt_keys table (key rotation)
 * - Updates users table (wallet columns)
 */

export async function up(knex: Knex): Promise<void> {
    console.log('🚀 Starting Phase 1 migration: Wallet System Database Schema');

    // 1. Create wallets table
    await knex.schema.createTable('wallets', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('label', 255).unique().notNullable()
            .comment('Format: username@organization');
        table.text('certificate').notNullable()
            .comment('X.509 certificate in PEM format');
        table.text('private_key').notNullable()
            .comment('ENCRYPTED private key (AES-256-GCM)');
        table.string('encryption_iv', 32).notNullable()
            .comment('Initialization vector for encryption');
        table.string('encryption_tag', 32).notNullable()
            .comment('Authentication tag for GCM mode');
        table.string('msp_id', 100).notNullable()
            .comment('Organization MSP ID');
        table.string('type', 20).defaultTo('X.509');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.timestamp('last_used_at')
            .comment('Track wallet usage for cleanup');

        // Foreign key to organizations
        table.foreign('msp_id')
            .references('msp_id')
            .inTable('organizations')
            .onDelete('CASCADE');

        // Indexes for performance
        table.index('label', 'idx_wallets_label');
        table.index('msp_id', 'idx_wallets_msp_id');
        table.index('last_used_at', 'idx_wallets_last_used');
    });

    console.log('✅ Created wallets table');

    // 2. Update users table
    await knex.schema.alterTable('users', (table) => {
        table.string('wallet_id', 255).unique()
            .comment('Link to wallet (e.g., john@org1)');
        table.string('certificate_serial', 255)
            .comment('Certificate serial number for revocation');
        table.boolean('enrolled').defaultTo(false)
            .comment('Whether user has been enrolled with Fabric CA');
        table.string('enrollment_secret', 255)
            .comment('Temporary secret from CA registration');
        table.timestamp('enrolled_at')
            .comment('Timestamp of enrollment');

        // Indexes
        table.index('wallet_id', 'idx_users_wallet_id');
        table.index('certificate_serial', 'idx_users_certificate_serial');
        table.index('enrolled', 'idx_users_enrolled');
    });

    console.log('✅ Updated users table with wallet columns');

    // 3. Create certificate_revocations table
    await knex.schema.createTable('certificate_revocations', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('certificate_serial', 255).unique().notNullable();
        table.string('wallet_id', 255);
        table.uuid('revoked_by').references('id').inTable('users');
        table.string('revocation_reason', 255);
        table.timestamp('revoked_at').defaultTo(knex.fn.now());

        // Foreign key to wallets
        table.foreign('wallet_id')
            .references('label')
            .inTable('wallets')
            .onDelete('SET NULL');

        // Indexes
        table.index('certificate_serial', 'idx_cert_revocations_serial');
        table.index('wallet_id', 'idx_cert_revocations_wallet');
        table.index('revoked_at', 'idx_cert_revocations_date');
    });

    console.log('✅ Created certificate_revocations table');

    // 4. Create jwt_keys table
    await knex.schema.createTable('jwt_keys', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('key_id', 50).unique().notNullable()
            .comment('e.g., key-2025-12');
        table.text('private_key').notNullable()
            .comment('RSA private key in PEM format');
        table.text('public_key').notNullable()
            .comment('RSA public key in PEM format');
        table.string('algorithm', 20).defaultTo('RS256');
        table.boolean('is_active').defaultTo(true)
            .comment('Only one active key at a time');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('expires_at')
            .comment('Key expiry for cleanup');

        // Indexes
        table.index('key_id', 'idx_jwt_keys_key_id');
        table.index('is_active', 'idx_jwt_keys_active');
        table.index('expires_at', 'idx_jwt_keys_expires');
    });

    console.log('✅ Created jwt_keys table');
    console.log('🎉 Phase 1 migration completed successfully!');
}

export async function down(knex: Knex): Promise<void> {
    console.log('🔄 Rolling back Phase 1 migration');

    // Drop in reverse order
    await knex.schema.dropTableIfExists('jwt_keys');
    console.log('✅ Dropped jwt_keys table');

    await knex.schema.dropTableIfExists('certificate_revocations');
    console.log('✅ Dropped certificate_revocations table');

    // Remove columns from users table
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('wallet_id');
        table.dropColumn('certificate_serial');
        table.dropColumn('enrolled');
        table.dropColumn('enrollment_secret');
        table.dropColumn('enrolled_at');
    });
    console.log('✅ Removed wallet columns from users table');

    await knex.schema.dropTableIfExists('wallets');
    console.log('✅ Dropped wallets table');

    console.log('🔄 Phase 1 rollback completed');
}
