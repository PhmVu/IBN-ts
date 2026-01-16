import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Check if columns already exist (idempotent)
    const hasExpiryColumn = await knex.schema.hasColumn('wallets', 'certificate_expires_at');
    const hasNotifiedColumn = await knex.schema.hasColumn('wallets', 'certificate_notified_at');
    const hasRevokedColumn = await knex.schema.hasColumn('wallets', 'revoked');

    await knex.schema.alterTable('wallets', (table) => {
        // Certificate expiry tracking
        if (!hasExpiryColumn) {
            table.timestamp('certificate_expires_at').nullable();
            console.log('  ✓ Added certificate_expires_at column');
        }

        // Expiry notification tracking (prevent spam)
        if (!hasNotifiedColumn) {
            table.timestamp('certificate_notified_at').nullable();
            console.log('  ✓ Added certificate_notified_at column');
        }

        // Revocation tracking (enhanced)
        if (!hasRevokedColumn) {
            table.boolean('revoked').defaultTo(false);
            table.timestamp('revoked_at').nullable();
            table.string('revocation_reason', 100).nullable();
            console.log('  ✓ Added revocation columns');
        }
    });

    // Create indexes for efficient queries
    await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_wallets_expiry 
    ON wallets(certificate_expires_at) 
    WHERE certificate_expires_at IS NOT NULL;
  `);
    console.log('  ✓ Created index idx_wallets_expiry');

    await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_wallets_revoked 
    ON wallets(revoked) 
    WHERE revoked = true;
  `);
    console.log('  ✓ Created index idx_wallets_revoked');

    console.log('✅ Certificate lifecycle columns added to wallets table');
}

export async function down(knex: Knex): Promise<void> {
    // Drop indexes
    await knex.schema.raw('DROP INDEX IF EXISTS idx_wallets_expiry');
    console.log('  ✓ Dropped index idx_wallets_expiry');

    await knex.schema.raw('DROP INDEX IF EXISTS idx_wallets_revoked');
    console.log('  ✓ Dropped index idx_wallets_revoked');

    // Check if columns exist before dropping
    const hasExpiryColumn = await knex.schema.hasColumn('wallets', 'certificate_expires_at');
    const hasNotifiedColumn = await knex.schema.hasColumn('wallets', 'certificate_notified_at');
    const hasRevokedColumn = await knex.schema.hasColumn('wallets', 'revoked');

    await knex.schema.alterTable('wallets', (table) => {
        if (hasExpiryColumn) {
            table.dropColumn('certificate_expires_at');
            console.log('  ✓ Dropped certificate_expires_at column');
        }
        if (hasNotifiedColumn) {
            table.dropColumn('certificate_notified_at');
            console.log('  ✓ Dropped certificate_notified_at column');
        }
        if (hasRevokedColumn) {
            table.dropColumn('revoked');
            table.dropColumn('revoked_at');
            table.dropColumn('revocation_reason');
            console.log('  ✓ Dropped revocation columns');
        }
    });

    console.log('✅ Certificate lifecycle columns removed');
}
