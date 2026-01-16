/**
 * Role Model - Defines user roles in the system
 */

import { Permission } from './Permission';

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Role creation input
 */
export interface CreateRoleInput {
  name: string;
  description?: string;
  is_system?: boolean;
}

/**
 * Role update input
 */
export interface UpdateRoleInput {
  name?: string;
  description?: string;
}

/**
 * System role names (enum for type safety)
 */
export enum SystemRole {
  SUPER_ADMIN = 'SuperAdmin',
  ORG_ADMIN = 'OrgAdmin',
  USER = 'User',
  AUDITOR = 'Auditor',
}

/**
 * Role with permissions (for queries joining role_permissions)
 */
export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}
