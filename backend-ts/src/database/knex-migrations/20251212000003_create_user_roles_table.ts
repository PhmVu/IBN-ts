import { Knex } from 'knex';

/**
 * Migration: Create user_roles table
 * Maps users to roles (many-to-many relationship)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().comment('Reference to users table');
    table.uuid('role_id').notNullable().comment('Reference to roles table');
    table.uuid('assigned_by').comment('User who assigned this role');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').comment('Optional role expiration date');

    // Foreign keys (roles exists in Phase 1)
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');

    // Unique constraint: one user cannot have the same role twice
    table.unique(['user_id', 'role_id'], { indexName: 'uq_user_roles' });

    // Indexes
    table.index('user_id', 'idx_user_roles_user_id');
    table.index('role_id', 'idx_user_roles_role_id');
    table.index('expires_at', 'idx_user_roles_expires_at');
  });

  // Conditionally add FKs to users if the table exists
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    await knex.schema.alterTable('user_roles', (table) => {
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('assigned_by').references('id').inTable('users').onDelete('SET NULL');
    });
  } else {
    console.log('⚠ Skipping FKs to users: table "users" not found');
  }

  console.log('✓ Created table: user_roles');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_roles');
  console.log('✓ Dropped table: user_roles');
}
