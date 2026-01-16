import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Enable UUID extension
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const exists = await knex.schema.hasTable('users');
    if (!exists) {
        await knex.schema.createTable('users', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.string('username').unique().notNullable();
            table.string('email').unique().notNullable();
            table.string('password_hash').notNullable();
            table.string('role').defaultTo('user');
            table.boolean('is_active').defaultTo(true);
            table.timestamps(true, true);
        });
        console.log('✓ Created table: users');
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('users');
}
