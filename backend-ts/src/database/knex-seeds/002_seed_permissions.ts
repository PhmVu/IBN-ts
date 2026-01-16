import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed: Insert default permissions
 * Creates 54 granular permissions for all resources
 */
export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries
  try {
    await knex('role_permissions').del();
  } catch (e) {
    // Table may not exist
  }

  try {
    await knex('permissions').del();
  } catch (e) {
    // Table may not exist
  }

  // Insert permissions
  const permissions = [
    // Users permissions
    { resource: 'users', action: 'create', description: 'Create new users' },
    { resource: 'users', action: 'read', description: 'View user details' },
    { resource: 'users', action: 'update', description: 'Update user information' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    { resource: 'users', action: 'list', description: 'List all users' },

    // Roles permissions
    { resource: 'roles', action: 'create', description: 'Create new roles' },
    { resource: 'roles', action: 'read', description: 'View role details' },
    { resource: 'roles', action: 'update', description: 'Update role information' },
    { resource: 'roles', action: 'delete', description: 'Delete roles' },
    { resource: 'roles', action: 'list', description: 'List all roles' },
    { resource: 'roles', action: 'assign', description: 'Assign roles to users' },

    // Permissions permissions
    { resource: 'permissions', action: 'create', description: 'Create new permissions' },
    { resource: 'permissions', action: 'read', description: 'View permission details' },
    { resource: 'permissions', action: 'update', description: 'Update permissions' },
    { resource: 'permissions', action: 'delete', description: 'Delete permissions' },
    { resource: 'permissions', action: 'list', description: 'List all permissions' },
    { resource: 'permissions', action: 'grant', description: 'Grant permissions to roles' },

    // Organizations permissions
    { resource: 'organizations', action: 'create', description: 'Create new organizations' },
    { resource: 'organizations', action: 'read', description: 'View organization details' },
    { resource: 'organizations', action: 'update', description: 'Update organization information' },
    { resource: 'organizations', action: 'delete', description: 'Delete organizations' },
    { resource: 'organizations', action: 'list', description: 'List all organizations' },
    { resource: 'organizations', action: 'activate', description: 'Activate organization' },
    { resource: 'organizations', action: 'deactivate', description: 'Deactivate organization' },

    // Channels permissions
    { resource: 'channels', action: 'create', description: 'Create new channels' },
    { resource: 'channels', action: 'read', description: 'View channel details' },
    { resource: 'channels', action: 'update', description: 'Update channel configuration' },
    { resource: 'channels', action: 'delete', description: 'Delete channels' },
    { resource: 'channels', action: 'list', description: 'List all channels' },
    { resource: 'channels', action: 'join', description: 'Join organization to channel' },

    // Chaincodes permissions
    { resource: 'chaincodes', action: 'create', description: 'Create/package chaincode' },
    { resource: 'chaincodes', action: 'read', description: 'View chaincode details' },
    { resource: 'chaincodes', action: 'update', description: 'Update chaincode' },
    { resource: 'chaincodes', action: 'delete', description: 'Delete chaincode' },
    { resource: 'chaincodes', action: 'list', description: 'List all chaincodes' },
    { resource: 'chaincodes', action: 'install', description: 'Install chaincode on peers' },
    { resource: 'chaincodes', action: 'approve', description: 'Approve chaincode definition' },
    { resource: 'chaincodes', action: 'commit', description: 'Commit chaincode to channel' },
    { resource: 'chaincodes', action: 'query', description: 'Query chaincode (read-only)' },
    { resource: 'chaincodes', action: 'invoke', description: 'Invoke chaincode (write operation)' },

    // Blocks permissions
    { resource: 'blocks', action: 'read', description: 'View block details' },
    { resource: 'blocks', action: 'list', description: 'List blocks in channel' },

    // Transactions permissions
    { resource: 'transactions', action: 'read', description: 'View transaction details' },
    { resource: 'transactions', action: 'list', description: 'List transactions' },
    { resource: 'transactions', action: 'submit', description: 'Submit new transactions' },

    // Certificates permissions
    { resource: 'certificates', action: 'create', description: 'Generate new certificates' },
    { resource: 'certificates', action: 'read', description: 'View certificate details' },
    { resource: 'certificates', action: 'list', description: 'List certificates' },
    { resource: 'certificates', action: 'revoke', description: 'Revoke certificates' },

    // Audit logs permissions
    { resource: 'audit_logs', action: 'read', description: 'View audit logs' },
    { resource: 'audit_logs', action: 'list', description: 'List audit logs' },

    // System permissions
    { resource: 'system', action: 'read', description: 'View system information' },
    { resource: 'system', action: 'configure', description: 'Configure system settings' },
    { resource: 'system', action: 'health', description: 'View system health status' },
  ];

  await knex('permissions').insert(
    permissions.map((p) => ({
      id: uuidv4(),
      name: `${p.resource}:${p.action}`,
      description: p.description,
      resource: p.resource,
      action: p.action,
    }))
  );

  // eslint-disable-next-line no-console
  console.log(`✓ Seeded ${permissions.length} default permissions`);
}
