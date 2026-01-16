import { Knex } from 'knex';

/**
 * Migration: Create role_permissions table
 * Maps roles to permissions (many-to-many relationship)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('role_id').notNullable().comment('Reference to roles table');
    table.uuid('permission_id').notNullable().comment('Reference to permissions table');
    table.uuid('granted_by').comment('User who granted this permission');
    table.timestamp('granted_at').defaultTo(knex.fn.now());

    // Foreign keys (roles and permissions exist in Phase 1)
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('permission_id').references('id').inTable('permissions').onDelete('CASCADE');

    // Unique constraint: one role cannot have the same permission twice
    table.unique(['role_id', 'permission_id'], { indexName: 'uq_role_permissions' });

    // Indexes
    table.index('role_id', 'idx_role_permissions_role_id');
    table.index('permission_id', 'idx_role_permissions_permission_id');
  });

  // Conditionally add FK to users if the table exists
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    await knex.schema.alterTable('role_permissions', (table) => {
      table.foreign('granted_by').references('id').inTable('users').onDelete('SET NULL');
    });
  } else {
    console.log('⚠ Skipping FK to users: table "users" not found');
  }

  console.log('✓ Created table: role_permissions');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('role_permissions');
  console.log('✓ Dropped table: role_permissions');
}
