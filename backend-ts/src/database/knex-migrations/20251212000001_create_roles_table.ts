import { Knex } from 'knex';

/**
 * Migration: Create roles table
 * Defines system roles (SuperAdmin, OrgAdmin, User, Auditor)
 */
export async function up(knex: Knex): Promise<void> {
  // Create extension first
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 50).notNullable().unique();
    table.text('description');
    table.boolean('is_system').defaultTo(false).comment('System-defined role, cannot be deleted');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('name', 'idx_roles_name');
  });

  // eslint-disable-next-line no-console
  console.log('✓ Created table: roles');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('roles');
  // eslint-disable-next-line no-console
  console.log('✓ Dropped table: roles');
}
