/**
 * RolePermission Model - Maps roles to permissions (many-to-many)
 */
export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted_by?: string;
  granted_at: Date;
}

/**
 * RolePermission creation input
 */
export interface CreateRolePermissionInput {
  role_id: string;
  permission_id: string;
  granted_by?: string;
}

/**
 * RolePermission with details (for queries)
 */
export interface RolePermissionWithDetails extends RolePermission {
  role_name: string;
  permission_resource: string;
  permission_action: string;
}
