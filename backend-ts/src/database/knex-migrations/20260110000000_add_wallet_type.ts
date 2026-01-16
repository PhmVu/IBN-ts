import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Add type column to wallets table
    const hasTypeColumn = await knex.schema.hasColumn('wallets', 'type');

    if (!hasTypeColumn) {
        await knex.schema.alterTable('wallets', (table) => {
            table.string('type', 20).defaultTo('user').notNullable();
        });

        // Create index for better query performance
        await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(type)');

        console.log('✅ Added type column to wallets table');
    } else {
        console.log('⏭️  Type column already exists in wallets table');
    }
}

export async function down(knex: Knex): Promise<void> {
    // Drop index
    await knex.schema.raw('DROP INDEX IF EXISTS idx_wallets_type');

    // Drop column
    const hasTypeColumn = await knex.schema.hasColumn('wallets', 'type');

    if (hasTypeColumn) {
        await knex.schema.alterTable('wallets', (table) => {
            table.dropColumn('type');
        });

        console.log('✅ Removed type column from wallets table');
    }
}
