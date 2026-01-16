import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create organizations table
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable().unique();
    table.string('msp_id', 100).notNullable().unique();
    table.string('domain', 255);
    table.text('description');
    table.jsonb('config').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('msp_id');
    table.index('is_active');
  });

  // Add organization_id to users table if not exists
  const hasColumn = await knex.schema.hasColumn('users', 'organization_id');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.uuid('organization_id').references('id').inTable('organizations').onDelete('SET NULL');
      table.index('organization_id');
    });
  }

  // Create trigger for updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await knex.raw(`
    CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop trigger
  await knex.raw('DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations');
  
  // Remove organization_id from users
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('organization_id');
  });
  
  // Drop organizations table
  await knex.schema.dropTableIfExists('organizations');
}
