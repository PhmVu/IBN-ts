/**
 * Permission Model - Defines granular permissions
 * Format: resource:action (e.g., users:create, chaincodes:query)
 */
export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  created_at: Date;
}

/**
 * Permission creation input
 */
export interface CreatePermissionInput {
  resource: string;
  action: string;
  description?: string;
}

/**
 * Permission format helper
 */
export function formatPermission(resource: string, action: string): string {
  return `${resource}:${action}`;
}

/**
 * Parse permission string
 */
export function parsePermission(permission: string): { resource: string; action: string } {
  const [resource, action] = permission.split(':');
  return { resource, action };
}

/**
 * System resources (enum for type safety)
 */
export enum PermissionResource {
  USERS = 'users',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',
  ORGANIZATIONS = 'organizations',
  CHANNELS = 'channels',
  CHAINCODES = 'chaincodes',
  BLOCKS = 'blocks',
  TRANSACTIONS = 'transactions',
}

/**
 * System actions (enum for type safety)
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  QUERY = 'query',
  INVOKE = 'invoke',
}
