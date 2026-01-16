import { db } from '@config/knex';
import { Organization } from '@models/Organization';
import logger from '@core/logger';

/**
 * User Context - Complete user information with organization and roles
 */
export interface UserContext {
  user_id: string;
  username: string;
  email: string;
  organization_id: string | null;
  is_superuser: boolean;
  roles: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Full Context - User + Organization + MSP information
 */
export interface FullContext {
  user: UserContext;
  organization: Organization | null;
  msp_id: string | null;
  msp_config: Record<string, any>;
}

/**
 * ContextBuilder Service
 * Maps user → organization → MSP_ID for Fabric certificate selection
 */
export class ContextBuilder {
  /**
   * Build complete context from user ID
   * Includes user, organization, MSP ID, and MSP configuration
   */
  static async buildContext(userId: string): Promise<FullContext> {
    try {
      logger.debug('Building context for user', { userId });

      // 1. Get user information
      const user = await db('users')
        .select(
          'id as user_id',
          'username',
          'email',
          'organization_id',
          'is_superuser'
        )
        .where('id', userId)
        .first();

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // 2. Get user roles
      const roles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .select('roles.id', 'roles.name')
        .where('user_roles.user_id', userId);

      const userContext: UserContext = {
        ...user,
        roles,
      };

      // 3. Get organization if user has one
      let organization: Organization | null = null;
      let msp_id: string | null = null;
      let msp_config: Record<string, any> = {};

      if (user.organization_id) {
        organization = await db('organizations')
          .select('*')
          .where('id', user.organization_id)
          .first();

        if (organization) {
          msp_id = organization.msp_id;
          msp_config = {
            msp_id: organization.msp_id,
            domain: organization.domain,
            ca_url: organization.ca_url,
            ...((organization as any).config || {}),
          };

          logger.debug('Organization context loaded', {
            org_id: organization.id,
            msp_id,
            domain: organization.domain,
          });
        } else {
          logger.warn('Organization not found for user', {
            userId,
            organization_id: user.organization_id,
          });
        }
      } else {
        logger.debug('User has no organization (likely SuperAdmin)', { userId });
      }

      const context: FullContext = {
        user: userContext,
        organization,
        msp_id,
        msp_config,
      };

      logger.info('Context built successfully', {
        userId,
        username: user.username,
        has_organization: !!organization,
        msp_id,
      });

      return context;
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to build context', {
          userId,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Build context from Express request (with JWT user)
   */
  static async buildContextFromRequest(req: any): Promise<FullContext> {
    if (!req.user || !req.user.id) {
      throw new Error('User not authenticated');
    }

    return ContextBuilder.buildContext(req.user.id);
  }

  /**
   * Get MSP ID for user (shortcut method)
   */
  static async getUserMspId(userId: string): Promise<string | null> {
    const context = await ContextBuilder.buildContext(userId);
    return context.msp_id;
  }

  /**
   * Get organization for user (shortcut method)
   */
  static async getUserOrganization(userId: string): Promise<Organization | null> {
    const context = await ContextBuilder.buildContext(userId);
    return context.organization;
  }
}

export default ContextBuilder;
