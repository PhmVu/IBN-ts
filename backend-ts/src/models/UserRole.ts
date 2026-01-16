/**
 * UserRole Model - Maps users to roles (many-to-many)
 */
export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at: Date;
  expires_at?: Date;
}

/**
 * UserRole creation input
 */
export interface CreateUserRoleInput {
  user_id: string;
  role_id: string;
  assigned_by?: string;
  expires_at?: Date;
}

/**
 * UserRole with role details (for queries)
 */
export interface UserRoleWithDetails extends UserRole {
  role_name: string;
  role_description?: string;
}
