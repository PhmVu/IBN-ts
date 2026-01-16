import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed: Insert default roles
 * Creates 4 system roles: SuperAdmin, OrgAdmin, User, Auditor
 */
export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries (only if not referenced)
  try {
    await knex('role_permissions').del();
  } catch (e) {
    // Table may not exist yet
  }

  try {
    await knex('user_roles').del();
  } catch (e) {
    // Table may not exist yet
  }

  try {
    await knex('roles').del();
  } catch (e) {
    // Table may not exist yet
  }

  // Insert roles
  await knex('roles').insert([
    {
      id: uuidv4(),
      name: 'SuperAdmin',
      description: 'System administrator with full access across all organizations. Bypass all permission checks.',
      is_system: true,
    },
    {
      id: uuidv4(),
      name: 'OrgAdmin',
      description: 'Organization administrator. Manage users, channels, and chaincodes within own organization.',
      is_system: true,
    },
    {
      id: uuidv4(),
      name: 'User',
      description: 'Standard user with limited access. Query chaincodes and view blocks within own organization.',
      is_system: true,
    },
    {
      id: uuidv4(),
      name: 'Auditor',
      description: 'Read-only auditor with cross-organization view capability for compliance and auditing.',
      is_system: true,
    },
  ]);

  console.log('✓ Seeded 4 default roles');
}
