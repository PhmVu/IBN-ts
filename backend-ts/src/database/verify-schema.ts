import { db, testConnection, closeConnection } from '@config/knex';
import logger from '@core/logger';

/**
 * Verify database schema after migrations
 */
async function verifyDatabase() {
  try {
    logger.info('🔍 Verifying database schema...\n');

    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Check tables exist
    const tables = ['roles', 'permissions', 'user_roles', 'role_permissions', 'organizations'];
    
    logger.info('📋 Checking tables:');
    for (const table of tables) {
      const exists = await db.schema.hasTable(table);
      logger.info(`  ${exists ? '✓' : '✗'} ${table}`);
      
      if (!exists) {
        throw new Error(`Table ${table} does not exist`);
      }
    }

    // Count records in each table
    logger.info('\n📊 Record counts:');
    
    const rolesCount = await db('roles').count('* as count').first();
    logger.info(`  - Roles: ${rolesCount?.count || 0}`);
    
    const permissionsCount = await db('permissions').count('* as count').first();
    logger.info(`  - Permissions: ${permissionsCount?.count || 0}`);
    
    const rolePermissionsCount = await db('role_permissions').count('* as count').first();
    logger.info(`  - Role-Permission mappings: ${rolePermissionsCount?.count || 0}`);
    
    const orgsCount = await db('organizations').count('* as count').first();
    logger.info(`  - Organizations: ${orgsCount?.count || 0}`);

    // Show roles
    logger.info('\n👥 Roles:');
    const roles = await db('roles').select('name', 'description', 'is_system');
    roles.forEach((role) => {
      logger.info(`  - ${role.name}: ${role.description} (system: ${role.is_system})`);
    });

    // Show permission summary by resource
    logger.info('\n🔐 Permissions by resource:');
    const permsByResource = await db('permissions')
      .select('resource')
      .count('* as count')
      .groupBy('resource')
      .orderBy('resource');
    
    permsByResource.forEach((item) => {
      logger.info(`  - ${item.resource}: ${item.count} permissions`);
    });

    // Show role-permission counts
    logger.info('\n📊 Permissions per role:');
    const rolePermCounts = await db('role_permissions as rp')
      .join('roles as r', 'rp.role_id', 'r.id')
      .select('r.name')
      .count('* as count')
      .groupBy('r.name')
      .orderBy('r.name');
    
    rolePermCounts.forEach((item) => {
      logger.info(`  - ${item.name}: ${item.count} permissions`);
    });

    // Sample permission check for SuperAdmin
    logger.info('\n🔍 Sample: SuperAdmin permissions (first 10):');
    const superAdminPerms = await db('role_permissions as rp')
      .join('roles as r', 'rp.role_id', 'r.id')
      .join('permissions as p', 'rp.permission_id', 'p.id')
      .where('r.name', 'SuperAdmin')
      .select('p.resource', 'p.action', 'p.description')
      .limit(10);
    
    superAdminPerms.forEach((perm) => {
      logger.info(`  - ${perm.resource}:${perm.action} - ${perm.description}`);
    });

    logger.info('\n✅ Database schema verification completed successfully!');
    
  } catch (error) {
    logger.error('❌ Verification failed:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await closeConnection();
  }
}

// Run if called directly
if (require.main === module) {
  verifyDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default verifyDatabase;
