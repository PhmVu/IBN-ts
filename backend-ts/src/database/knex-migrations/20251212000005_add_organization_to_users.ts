import { Knex } from 'knex';

/**
 * Migration: Add organization_id to users table
 * Links users to organizations for org-scoped RBAC
 */
export async function up(knex: Knex): Promise<void> {
  // Create organizations table
  const hasOrgsTable = await knex.schema.hasTable('organizations');
  
  if (!hasOrgsTable) {
    // Create organizations table if it doesn't exist
    await knex.schema.createTable('organizations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 255).notNullable();
      table.string('msp_id', 100).notNullable().unique().comment('Fabric MSP ID (e.g., Org1MSP)');
      table.string('domain', 255).notNullable();
      table.string('ca_url', 255).comment('Certificate Authority URL');
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Indexes
      table.index('msp_id', 'idx_organizations_msp_id');
      table.index('is_active', 'idx_organizations_is_active');
    });

    // eslint-disable-next-line no-console
    console.log('✓ Created table: organizations');
  }

  // Add organization_id to users table if exists, else skip gracefully
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    const hasColumn = await knex.schema.hasColumn('users', 'organization_id');
    if (!hasColumn) {
      await knex.schema.alterTable('users', (table) => {
        table.uuid('organization_id').nullable();
        table.index('organization_id', 'idx_users_organization_id');
      });
      // Add FK in a separate step to avoid failure if organizations doesn't exist yet
      await knex.schema.alterTable('users', (table) => {
        table.foreign('organization_id').references('id').inTable('organizations').onDelete('SET NULL');
      });
      // eslint-disable-next-line no-console
      console.log('✓ Added column: users.organization_id');
    } else {
      // eslint-disable-next-line no-console
      console.log('✓ Column already exists: users.organization_id');
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('⚠ Skipping users alteration: users table not found');
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove organization_id from users
  const hasOrgColumn = await knex.schema.hasColumn('users', 'organization_id');
  
  if (hasOrgColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropForeign(['organization_id']);
      table.dropColumn('organization_id');
    });

    // eslint-disable-next-line no-console
    console.log('✓ Removed organization_id column from users table');
  }

  // Note: We don't drop organizations table here as it might be used elsewhere
}
