import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

/**
 * Seed: Create a SuperAdmin user and assign role
 */
export async function seed(knex: Knex): Promise<void> {
  const username = 'admin';
  const email = 'admin@ibn.local';
  const password = 'admin123';

  const existing = await knex('users').where({ username }).first();
  if (existing) {
    console.log('SuperAdmin user already exists; updating role/org linkage.');
    await knex('users')
      .where({ id: existing.id })
      .update({ role: 'SuperAdmin', updated_at: knex.fn.now() });
  } else {
    const password_hash = await bcrypt.hash(password, 10);
    await knex('users')
      .insert({
        id: knex.raw('gen_random_uuid()'),
        username,
        email,
        password_hash,
        role: 'SuperAdmin',
        is_active: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      })
      .returning(['id']);

    // Assign SuperAdmin role handled via users.role string
    console.log('Seeded SuperAdmin user: superadmin / Admin@12345');
  }

  // Ensure at least one organization exists and link user
  const org = await knex('organizations').first();
  const user = await knex('users').where({ username }).first();

  if (user) {
    // 1. Link to Organization
    if (org) {
      await knex('users')
        .where({ id: user.id })
        .update({ organization_id: org.id, updated_at: knex.fn.now() });
      console.log(`Linked SuperAdmin to org ${org.name}`);
    }

    // 2. Assign SuperAdmin role in user_roles table (CRITICAL for RBAC)
    const superAdminRole = await knex('roles').where({ name: 'SuperAdmin' }).first();
    if (superAdminRole) {
      // Check if already assigned
      const hasRole = await knex('user_roles')
        .where({ user_id: user.id, role_id: superAdminRole.id })
        .first();

      if (!hasRole) {
        await knex('user_roles').insert({
          user_id: user.id,
          role_id: superAdminRole.id
        });
        console.log('Assigned SuperAdmin role to user in user_roles table');
      }
    }
  }
}
