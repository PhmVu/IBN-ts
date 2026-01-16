import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed: Map permissions to roles
 * Assigns appropriate permissions to each role based on role hierarchy
 */
export async function seed(knex: Knex): Promise<void> {
  // Get role IDs
  const superAdmin = await knex('roles').where('name', 'SuperAdmin').first();
  const orgAdmin = await knex('roles').where('name', 'OrgAdmin').first();
  const user = await knex('roles').where('name', 'User').first();
  const auditor = await knex('roles').where('name', 'Auditor').first();

  if (!superAdmin || !orgAdmin || !user || !auditor) {
    throw new Error('Roles not found. Please run 001_seed_roles first.');
  }

  // Get all permissions
  const allPermissions = await knex('permissions').select('id', 'resource', 'action');

  // Helper function to find permission ID
  const getPermissionId = (resource: string, action: string) => {
    const perm = allPermissions.find((p) => p.resource === resource && p.action === action);
    return perm?.id;
  };

  // Delete existing mappings
  try {
    await knex('role_permissions').del();
  } catch (e) {
    // Table may not exist
  }

  // SuperAdmin: ALL permissions (bypass logic in code, but assign all for consistency)
  const superAdminPermissions = allPermissions.map((p) => ({
    id: uuidv4(),
    role_id: superAdmin.id,
    permission_id: p.id,
  }));

  // OrgAdmin: Manage users, channels, chaincodes within org
  const orgAdminPermissionsList = [
    // Users (within org)
    ['users', 'create'],
    ['users', 'read'],
    ['users', 'update'],
    ['users', 'delete'],
    ['users', 'list'],
    // Roles (view only)
    ['roles', 'read'],
    ['roles', 'list'],
    ['roles', 'assign'],
    // Organizations (own org only)
    ['organizations', 'read'],
    ['organizations', 'update'],
    ['organizations', 'activate'],
    ['organizations', 'deactivate'],
    // Channels
    ['channels', 'create'],
    ['channels', 'read'],
    ['channels', 'update'],
    ['channels', 'delete'],
    ['channels', 'list'],
    ['channels', 'join'],
    // Chaincodes
    ['chaincodes', 'create'],
    ['chaincodes', 'read'],
    ['chaincodes', 'update'],
    ['chaincodes', 'delete'],
    ['chaincodes', 'list'],
    ['chaincodes', 'install'],
    ['chaincodes', 'approve'],
    ['chaincodes', 'commit'],
    ['chaincodes', 'query'],
    ['chaincodes', 'invoke'],
    // Blocks & Transactions
    ['blocks', 'read'],
    ['blocks', 'list'],
    ['transactions', 'read'],
    ['transactions', 'list'],
    ['transactions', 'submit'],
    // Certificates (within org)
    ['certificates', 'create'],
    ['certificates', 'read'],
    ['certificates', 'list'],
    // Audit logs (own org)
    ['audit_logs', 'read'],
    ['audit_logs', 'list'],
  ];

  const orgAdminPermissions = orgAdminPermissionsList
    .map(([resource, action]) => {
      const permId = getPermissionId(resource, action);
      return permId
        ? {
            id: knex.raw('uuid_generate_v4()'),
            role_id: orgAdmin.id,
            permission_id: permId,
          }
        : null;
    })
    .filter(Boolean);

  // User: Read-only access within org
  const userPermissionsList = [
    // Users (read own profile)
    ['users', 'read'],
    // Organizations (view own org)
    ['organizations', 'read'],
    // Channels (view)
    ['channels', 'read'],
    ['channels', 'list'],
    // Chaincodes (query only, no invoke)
    ['chaincodes', 'read'],
    ['chaincodes', 'list'],
    ['chaincodes', 'query'],
    // Blocks & Transactions (view)
    ['blocks', 'read'],
    ['blocks', 'list'],
    ['transactions', 'read'],
    ['transactions', 'list'],
    // Certificates (view own)
    ['certificates', 'read'],
  ];

  const userPermissions = userPermissionsList
    .map(([resource, action]) => {
      const permId = getPermissionId(resource, action);
      return permId
        ? {
            id: knex.raw('uuid_generate_v4()'),
            role_id: user.id,
            permission_id: permId,
          }
        : null;
    })
    .filter(Boolean);

  // Auditor: Read-only access across all organizations
  const auditorPermissionsList = [
    // Users (view all)
    ['users', 'read'],
    ['users', 'list'],
    // Organizations (view all)
    ['organizations', 'read'],
    ['organizations', 'list'],
    // Channels (view all)
    ['channels', 'read'],
    ['channels', 'list'],
    // Chaincodes (view only, no query/invoke)
    ['chaincodes', 'read'],
    ['chaincodes', 'list'],
    // Blocks & Transactions (view all)
    ['blocks', 'read'],
    ['blocks', 'list'],
    ['transactions', 'read'],
    ['transactions', 'list'],
    // Certificates (view all)
    ['certificates', 'read'],
    ['certificates', 'list'],
    // Audit logs (view all)
    ['audit_logs', 'read'],
    ['audit_logs', 'list'],
    // System (view info)
    ['system', 'read'],
    ['system', 'health'],
  ];

  const auditorPermissions = auditorPermissionsList
    .map(([resource, action]) => {
      const permId = getPermissionId(resource, action);
      return permId
        ? {
            id: knex.raw('uuid_generate_v4()'),
            role_id: auditor.id,
            permission_id: permId,
          }
        : null;
    })
    .filter(Boolean);

  // Insert all role-permission mappings
  await knex('role_permissions').insert([
    ...superAdminPermissions,
    ...orgAdminPermissions,
    ...userPermissions,
    ...auditorPermissions,
  ]);

  // eslint-disable-next-line no-console
  console.log('✓ Mapped permissions to roles:');
  // eslint-disable-next-line no-console
  console.log(`  - SuperAdmin: ${superAdminPermissions.length} permissions (ALL)`);
  // eslint-disable-next-line no-console
  console.log(`  - OrgAdmin: ${orgAdminPermissions.length} permissions`);
  // eslint-disable-next-line no-console
  console.log(`  - User: ${userPermissions.length} permissions`);
  // eslint-disable-next-line no-console
  console.log(`  - Auditor: ${auditorPermissions.length} permissions`);
}
