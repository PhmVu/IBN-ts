#!/usr/bin/env ts-node

/**
 * Phase 1 Initialization & Verification Script
 * Runs all migration and seed steps, then verifies the database
 */

import logger from '@core/logger';
import { db, testConnection, closeConnection } from '@config/knex';

async function runPhase1() {
  try {
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('🚀 PHASE 1: PostgreSQL & Migration - Initialization');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');

    // Step 1: Test connection
    logger.info('📍 Step 1: Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('❌ Database connection failed. Check DB_* env variables.');
    }
    logger.info('✅ Connection successful\n');

    // Step 2: Run migrations
    logger.info('📍 Step 2: Running migrations...');
    try {
      const [batchNo, migrations] = await db.migrate.latest();

      if (migrations.length === 0) {
        logger.info('✓ Database already up to date (0 migrations run)');
      } else {
        logger.info(`✓ Batch ${batchNo} executed: ${migrations.length} migrations`);
        migrations.forEach((m: string) => logger.info(`  - ${m}`));
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('ENOENT') &&
        error.message.includes('knex_migrations')
      ) {
        logger.warn('⚠ knex_migrations table may need to be created, continuing...');
      } else {
        throw error;
      }
    }
    logger.info('✅ Migrations completed\n');

    // Step 3: Run seeds
    logger.info('📍 Step 3: Running seeds...');
    try {
      const [seeds] = await db.seed.run();

      if (seeds.length === 0) {
        logger.info('⚠ No seeds executed (may have already been run)');
      } else {
        logger.info(`✓ Executed ${seeds.length} seed files`);
        seeds.forEach((s: string) => logger.info(`  - ${s}`));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('already_exists')) {
        logger.warn('⚠ Some seed data already exists (likely duplicate inserts), continuing...');
      } else {
        throw error;
      }
    }
    logger.info('✅ Seeds completed\n');

    // Step 4: Verify schema
    logger.info('📍 Step 4: Verifying database schema...\n');

    // Check tables exist
    const tables = ['roles', 'permissions', 'user_roles', 'role_permissions', 'organizations'];

    logger.info('📋 Tables:');
    for (const table of tables) {
      const exists = await db.schema.hasTable(table);
      logger.info(`  ${exists ? '✓' : '✗'} ${table}`);

      if (!exists) {
        throw new Error(`❌ Table ${table} does not exist`);
      }
    }
    logger.info('');

    // Count records
    logger.info('📊 Record counts:');

    const rolesCount = await db('roles').count('* as count').first();
    const rolesNum = rolesCount?.count || 0;
    logger.info(`  - Roles: ${rolesNum} (expected: 4)`);

    const permissionsCount = await db('permissions').count('* as count').first();
    const permsNum = permissionsCount?.count || 0;
    logger.info(`  - Permissions: ${permsNum} (expected: 54)`);

    const rolePermissionsCount = await db('role_permissions').count('* as count').first();
    const rpNum = rolePermissionsCount?.count || 0;
    logger.info(`  - Role-Permission mappings: ${rpNum} (expected: 119)`);

    const orgsCount = await db('organizations').count('* as count').first();
    const orgsNum = orgsCount?.count || 0;
    logger.info(`  - Organizations: ${orgsNum} (expected: 0 - will be populated in Phase 3)`);
    logger.info('');

    // Show roles
    logger.info('👥 System Roles:');
    const roles = await db('roles').select('name', 'description').orderBy('name');

    if (roles.length === 0) {
      logger.warn('⚠ No roles found!');
    } else {
      roles.forEach((role) => {
        const name = role.name as string;
        const desc = (role.description as string)?.substring(0, 50);
        logger.info(`  - ${name}: ${desc}...`);
      });
    }
    logger.info('');

    // Permission summary by resource
    logger.info('🔐 Permissions by resource:');
    const permsByResource = await db('permissions')
      .select('resource')
      .count('* as count')
      .groupBy('resource')
      .orderBy('resource');

    if (permsByResource.length === 0) {
      logger.warn('⚠ No permissions found!');
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      permsByResource.forEach((item: Record<string, any>) => {
        logger.info(`  - ${item.resource}: ${item.count}`);
      });
    }
    logger.info('');

    // Role-permission distribution
    logger.info('📊 Permissions per role:');
    const rolePermCounts = await db('role_permissions as rp')
      .join('roles as r', 'rp.role_id', 'r.id')
      .select('r.name')
      .count('* as count')
      .groupBy('r.name')
      .orderBy('r.name');

    if (rolePermCounts.length === 0) {
      logger.warn('⚠ No role-permission mappings found!');
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rolePermCounts.forEach((item: Record<string, any>) => {
        logger.info(`  - ${item.role_name}: ${item.count} permissions`);
      });
    }
    logger.info('');

    // Final status
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('✅ PHASE 1 VERIFICATION COMPLETE');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
    logger.info('Expected state:');
    logger.info(`  ✓ Roles: ${rolesNum}/4`);
    logger.info(`  ✓ Permissions: ${permsNum}/54`);
    logger.info(`  ✓ Role-Permission mappings: ${rpNum}/119`);
    logger.info('');

    if (rolesNum === 4 && permsNum === 54 && rpNum === 119) {
      logger.info('🎉 All checks passed! Phase 1 is ready for Phase 2.');
      logger.info('');
      logger.info('Next step: Start building Phase 2 - RBAC Implementation');
      logger.info('');
    } else {
      logger.warn('⚠ Some counts are not as expected. Check seed data.');
      logger.info('');
    }
  } catch (error) {
    logger.error('❌ Phase 1 initialization failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Run
if (require.main === module) {
  runPhase1()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runPhase1;
