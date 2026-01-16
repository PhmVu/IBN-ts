import { Knex } from 'knex';

/**
 * Migration: Create permissions table
 * Defines granular permissions (resource:action format)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 150).notNullable().unique().comment('Permission key in resource:action format');
    table.string('resource', 100).notNullable().comment('Resource name (users, channels, chaincodes, etc.)');
    table.string('action', 50).notNullable().comment('Action (create, read, update, delete, query, invoke)');
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Unique constraint on resource + action
    table.unique(['resource', 'action'], { indexName: 'uq_permissions_resource_action' });

    // Indexes
    table.index('resource', 'idx_permissions_resource');
    table.index('action', 'idx_permissions_action');
  });

  // eslint-disable-next-line no-console
  console.log('✓ Created table: permissions');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('permissions');
  // eslint-disable-next-line no-console
  console.log('✓ Dropped table: permissions');
}
