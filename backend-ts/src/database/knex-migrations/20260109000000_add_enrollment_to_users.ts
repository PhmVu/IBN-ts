import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('users');
    if (!hasTable) {
        console.log('⚠ Users table does not exist, skipping migration');
        return;
    }

    // Check each column individually and add only if it doesn't exist
    const hasIsEnrolled = await knex.schema.hasColumn('users', 'is_enrolled');
    const hasFabricIdentityId = await knex.schema.hasColumn('users', 'fabric_identity_id');
    const hasEnrolledAt = await knex.schema.hasColumn('users', 'enrolled_at');

    if (!hasIsEnrolled || !hasFabricIdentityId || !hasEnrolledAt) {
        await knex.schema.alterTable('users', (table) => {
            if (!hasIsEnrolled) {
                table.boolean('is_enrolled').defaultTo(false);
                console.log('✓ Added is_enrolled column');
            }
            if (!hasFabricIdentityId) {
                table.string('fabric_identity_id').nullable();
                console.log('✓ Added fabric_identity_id column');
            }
            if (!hasEnrolledAt) {
                table.timestamp('enrolled_at').nullable();
                console.log('✓ Added enrolled_at column');
            }
        });
        console.log('✓ Migration completed');
    } else {
        console.log('⚠ All enrollment columns already exist, skipping');
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('users');
    if (!hasTable) return;

    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('is_enrolled');
        table.dropColumn('fabric_identity_id');
        table.dropColumn('enrolled_at');
    });
}
