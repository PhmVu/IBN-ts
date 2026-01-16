import { db } from '../config/knex';
import logger from '../core/logger';

/**
 * Interface for Role
 */
interface Role {
  id: string;
  name: string;
  description?: string;
  is_system?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Interface for Permission
 */
interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  created_at?: Date;
}

/**
 * RBAC Service - Core permission checking logic
 * 
 * Features:
 * - SuperAdmin bypass (always true)
 * - OrgAdmin org-scoped access
 * - User/Auditor specific permissions
 * - Role and permission management
 */
export class RBACService {
  /**
   * Get all roles assigned to a user
   * @param userId - User ID
   * @returns Array of roles
   */
  static async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const roles = await db('roles')
        .select('roles.*')
        .join('user_roles', 'roles.id', 'user_roles.role_id')
        .where('user_roles.user_id', userId);

      logger.debug('getUserRoles', {
        userId,
        roleCount: roles.length,
        roleNames: roles.map((r: Role) => r.name),
      });

      return roles;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to get user roles', {
          userId,
          error: error.message,
        });
      }
      return [];
    }
  }

  /**
   * Get all permissions for a user (aggregated from all roles)
   * @param userId - User ID
   * @returns Array of permissions
   */
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const permissions = await db('permissions')
        .distinct('permissions.*')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .join('user_roles', 'role_permissions.role_id', 'user_roles.role_id')
        .where('user_roles.user_id', userId);

      logger.debug('getUserPermissions', {
        userId,
        permissionCount: permissions.length,
        permissions: permissions.map((p: Permission) => `${p.resource}:${p.action}`),
      });

      return permissions;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to get user permissions', {
          userId,
          error: error.message,
        });
      }
      return [];
    }
  }

  /**
   * Get permissions as string array (resource:action format)
   * @param userId - User ID
   * @returns Array of permission strings
   */
  static async getUserPermissionStrings(userId: string): Promise<string[]> {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.map((p: Permission) => `${p.resource}:${p.action}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to get user permission strings', {
          userId,
          error: error.message,
        });
      }
      return [];
    }
  }

  /**
   * Core permission checking logic
   * 
   * Authorization flow:
   * 1. SuperAdmin → Always true (bypass all checks)
   * 2. Check if user has the specific permission
   * 3. Check org-scope (if applicable):
   *    - OrgAdmin/User limited to own organization
   *    - Auditor can read cross-org
   * 
   * @param userId - User ID
   * @param resource - Resource name (e.g., 'users', 'channels')
   * @param action - Action name (e.g., 'create', 'read', 'update', 'delete')
   * @param resourceOrgId - Optional: Organization ID of the resource (for org-scoped checks)
   * @returns true if allowed, false if denied
   */
  static async checkPermission(
    userId: string,
    resource: string,
    action: string,
    resourceOrgId?: string
  ): Promise<boolean> {
    try {
      // Step 1: Get user with organization
      const user = await db('users').where({ id: userId }).first();
      if (!user) {
        logger.warn('User not found for permission check', { userId });
        return false;
      }

      // Step 2: SuperAdmin bypass - always allow
      if (user.is_superuser) {
        logger.debug('Permission check: SuperAdmin bypass', {
          userId,
          resource,
          action,
        });
        return true;
      }

      // Step 3: Get user roles
      const roles = await this.getUserRoles(userId);
      const roleNames = roles.map((r: Role) => r.name);

      // SuperAdmin role bypass (in case is_superuser flag is false but has role)
      if (roleNames.includes('SuperAdmin')) {
        logger.debug('Permission check: SuperAdmin role bypass', {
          userId,
          resource,
          action,
        });
        return true;
      }

      // Step 4: Check if user has the permission
      const permissions = await this.getUserPermissions(userId);
      const hasPermission = permissions.some(
        (p: Permission) => p.resource === resource && p.action === action
      );

      if (!hasPermission) {
        logger.warn('Permission denied: permission not found', {
          userId,
          resource,
          action,
          userRoles: roleNames,
        });
        return false;
      }

      // Step 5: Organization-scoped check
      if (resourceOrgId) {
        // OrgAdmin và User chỉ access resources của org mình
        if (roleNames.includes('OrgAdmin') || roleNames.includes('User')) {
          if (user.organization_id !== resourceOrgId) {
            logger.warn('Permission denied: org-scope violation', {
              userId,
              userOrg: user.organization_id,
              resourceOrg: resourceOrgId,
              resource,
              action,
            });
            return false;
          }
        }
        // Auditor có thể xem cross-org (nếu có permission)
        // SuperAdmin đã bypass ở trên
      }

      logger.debug('Permission allowed', {
        userId,
        resource,
        action,
        userRoles: roleNames,
      });

      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Error checking permission', {
          userId,
          resource,
          action,
          error: error.message,
        });
      }
      return false;
    }
  }

  /**
   * Check if user has a specific role
   * @param userId - User ID
   * @param roleName - Role name
   * @returns true if user has role
   */
  static async hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId);
      const hasRole = roles.some((r: Role) => r.name === roleName);

      logger.debug('hasRole check', {
        userId,
        roleName,
        hasRole,
      });

      return hasRole;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Error checking role', {
          userId,
          roleName,
          error: error.message,
        });
      }
      return false;
    }
  }

  /**
   * Check if user has any of the specified roles
   * @param userId - User ID
   * @param roleNames - Array of role names
   * @returns true if user has any of the roles
   */
  static async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId);
      const userRoleNames = roles.map((r: Role) => r.name);
      const hasAnyRole = roleNames.some((rn: string) => userRoleNames.includes(rn));

      logger.debug('hasAnyRole check', {
        userId,
        requiredRoles: roleNames,
        userRoles: userRoleNames,
        hasAnyRole,
      });

      return hasAnyRole;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Error checking any role', {
          userId,
          roleNames,
          error: error.message,
        });
      }
      return false;
    }
  }

  /**
   * Assign a role to a user
   * @param userId - User ID
   * @param roleId - Role ID
   * @throws Error if role already assigned
   */
  static async assignRole(userId: string, roleId: string): Promise<void> {
    try {
      // Check if already assigned
      const existing = await db('user_roles')
        .where({ user_id: userId, role_id: roleId })
        .first();

      if (existing) {
        throw new Error('Role already assigned to user');
      }

      await db('user_roles').insert({
        user_id: userId,
        role_id: roleId,
      });

      logger.info('Role assigned to user', {
        userId,
        roleId,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to assign role', {
          userId,
          roleId,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Revoke a role from a user
   * @param userId - User ID
   * @param roleId - Role ID
   * @returns true if role was revoked, false if not found
   */
  static async revokeRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const deleted = await db('user_roles')
        .where({ user_id: userId, role_id: roleId })
        .del();

      if (deleted > 0) {
        logger.info('Role revoked from user', {
          userId,
          roleId,
        });
        return true;
      }

      logger.warn('Role not found for user', {
        userId,
        roleId,
      });
      return false;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to revoke role', {
          userId,
          roleId,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Get role by name
   * @param name - Role name
   * @returns Role object or undefined
   */
  static async getRoleByName(name: string): Promise<Role | undefined> {
    try {
      const role = await db('roles').where({ name }).first();

      if (role) {
        logger.debug('Role found by name', { name });
      } else {
        logger.warn('Role not found by name', { name });
      }

      return role;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to get role by name', {
          name,
          error: error.message,
        });
      }
      return undefined;
    }
  }

  /**
   * Get role by ID
   * @param id - Role ID
   * @returns Role object or undefined
   */
  static async getRoleById(id: string): Promise<Role | undefined> {
    try {
      const role = await db('roles').where({ id }).first();

      if (role) {
        logger.debug('Role found by ID', { id });
      } else {
        logger.warn('Role not found by ID', { id });
      }

      return role;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to get role by ID', {
          id,
          error: error.message,
        });
      }
      return undefined;
    }
  }

  /**
   * Get all roles
   * @returns Array of all roles
   */
  static async getAllRoles(): Promise<Role[]> {
    try {
      const roles = await db('roles').select('*').orderBy('name');

      logger.debug('All roles retrieved', {
        count: roles.length,
      });

      return roles;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to get all roles', {
          error: error.message,
        });
      }
      return [];
    }
  }

  /**
   * Get all permissions
   * @returns Array of all permissions
   */
  static async getAllPermissions(): Promise<Permission[]> {
    try {
      const permissions = await db('permissions')
        .select('*')
        .orderBy(['resource', 'action']);

      logger.debug('All permissions retrieved', {
        count: permissions.length,
      });

      return permissions;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to get all permissions', {
          error: error.message,
        });
      }
      return [];
    }
  }

  /**
   * Get permissions for a specific role
   * @param roleId - Role ID
   * @returns Array of permissions
   */
  static async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const permissions = await db('permissions')
        .select('permissions.*')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .where('role_permissions.role_id', roleId)
        .orderBy(['permissions.resource', 'permissions.action']);

      logger.debug('Role permissions retrieved', {
        roleId,
        count: permissions.length,
      });

      return permissions;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to get role permissions', {
          roleId,
          error: error.message,
        });
      }
      return [];
    }
  }
}

export default RBACService;
