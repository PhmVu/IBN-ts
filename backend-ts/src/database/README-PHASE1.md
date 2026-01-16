# Phase 1: PostgreSQL & Migration with Knex.js

## 📋 Overview

Phase 1 implements the complete **database schema** for the RBAC (Role-Based Access Control) system using **Knex.js** query builder with **PostgreSQL**.

**Status**: ✅ **COMPLETED**

---

## 🎯 Objectives

- [x] Setup Knex.js query builder
- [x] Create RBAC database schema (5 tables)
 [x] Map permissions to roles (122 mappings)
- [x] Implement migrations (5 migration files)
- [x] Create seed data (4 roles, 54 permissions)
- [x] Map permissions to roles (119 mappings)

---

## 📦 What Was Built

### Database Tables

| Table | Purpose | Records |
|-------|---------|---------|
| `roles` | System roles (SuperAdmin, OrgAdmin, User, Auditor) | 4 |
| `permissions` | Granular permissions (resource:action format) | 54 |
 ✅ Seeds 4 roles + 54 permissions + 122 role-permission mappings
| `user_roles` | User-to-role mappings (many-to-many) | 0 (ready for Phase 2) |
| `role_permissions` | Role-to-permission mappings (many-to-many) | 119 |
| `organizations` | Organizations with MSP IDs for Fabric | 0 (ready for Phase 3) |

### File Structure

```
backend-ts/
├── knexfile.ts                          # Knex configuration
├── src/
│   ├── config/
│   │   └── knex.ts                      # Knex instance & connection helpers
│   ├── models/
│   │   ├── Role.ts                      # Role interface & types
│   │   ├── Permission.ts                # Permission interface & helpers
 `organizations` (7 permissions)
 `system` (3 permissions)
│   │   └── Organization.ts              # Organization interface (with msp_id)
│   └── database/
│       ├── knex-migrations/
│       │   ├── 20251212000001_create_roles_table.ts
│       │   ├── 20251212000002_create_permissions_table.ts
│       │   ├── 20251212000003_create_user_roles_table.ts
│       │   ├── 20251212000004_create_role_permissions_table.ts
│       │   └── 20251212000005_add_organization_to_users.ts
│       ├── knex-seeds/
│       │   ├── 001_seed_roles.ts        # Seeds 4 roles
│       │   ├── 002_seed_permissions.ts  # Seeds 54 permissions
│       │   └── 003_seed_role_permissions.ts # Maps permissions to roles
│       ├── knex-migrate.ts              # Migration runner
│       ├── knex-seed.ts                 # Seed runner
│       ├── knex-rollback.ts             # Rollback utility
│       └── verify-schema.ts             # Schema verification tool
└── PHASE1-COMPLETION.md                 # Detailed completion checklist
```

---

## 🚀 Quick Start

### 1. Install Dependencies

Already done during setup:
```bash
npm install knex @types/knex --save
```

### 2. Configure Environment

`.env` file (already created from `.env.example`):
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=ibn_user
DB_PASSWORD=ibn_password
DB_NAME=ibn_db
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### 3. Start PostgreSQL

```bash
# Using Docker (from project root)
docker-compose up -d postgres

# Or use existing PostgreSQL instance
```

### 4. Run Migrations

```bash
npm run knex:migrate
```

✅ Creates 5 tables: roles, permissions, user_roles, role_permissions, organizations

### 5. Run Seeds

```bash
npm run knex:seed
```

✅ Seeds 4 roles + 54 permissions + 119 role-permission mappings

### 6. Verify Schema

```bash
npm run db:verify
```

✅ Shows table statistics, role details, permission distribution

---

## 📊 RBAC Design

### 4 System Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **SuperAdmin** | God mode - full access across all orgs | ALL 54 (bypasses checks in code) |
| **OrgAdmin** | Organization administrator | 35 (org management, full chaincode) |
| **User** | Standard user | 13 (read-only, query chaincode) |
| **Auditor** | Cross-org read-only auditor | 17 (read all, no writes) |

### 54 Granular Permissions

**Format**: `resource:action`

**Resources**:
- `users` (5 permissions)
- `roles` (6 permissions)
- `permissions` (6 permissions)
- `organizations` (5 permissions)
- `channels` (6 permissions)
- `chaincodes` (10 permissions) ← **Key for Fabric**
- `blocks` (2 permissions)
- `transactions` (3 permissions)
- `certificates` (4 permissions)
- `audit_logs` (2 permissions)
- `system` (2 permissions)

**Actions**: create, read, update, delete, list, query, invoke, join, install, approve, commit, grant, assign, revoke, configure

---

## 🛠️ NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run knex:migrate` | Run all pending migrations |
| `npm run knex:seed` | Run all seed files |
| `npm run knex:rollback` | Rollback last migration batch |
| `npm run knex:migrate:make <name>` | Create new migration file |
| `npm run knex:seed:make <name>` | Create new seed file |
| `npm run db:verify` | Verify database schema & show stats |

---

## 🔍 Usage Examples

### Query Roles

```typescript
import db from '@config/knex';

// Get all roles
const roles = await db('roles').select('*');

// Get role by name
const superAdmin = await db('roles').where('name', 'SuperAdmin').first();

// Get role with permissions
const roleWithPerms = await db('roles as r')
  .leftJoin('role_permissions as rp', 'r.id', 'rp.role_id')
  .leftJoin('permissions as p', 'rp.permission_id', 'p.id')
  .where('r.name', 'OrgAdmin')
  .select('r.*', 'p.resource', 'p.action');
```

### Query Permissions

```typescript
// Get all permissions for a resource
const userPermissions = await db('permissions')
  .where('resource', 'users')
  .select('*');

// Check if permission exists
const canInvoke = await db('permissions')
  .where({ resource: 'chaincodes', action: 'invoke' })
  .first();
```

### Query User Roles

```typescript
// Get user's roles
const userRoles = await db('user_roles as ur')
  .join('roles as r', 'ur.role_id', 'r.id')
  .where('ur.user_id', userId)
  .select('r.name', 'r.description');

// Check if user has role
const isSuperAdmin = await db('user_roles as ur')
  .join('roles as r', 'ur.role_id', 'r.id')
  .where('ur.user_id', userId)
  .andWhere('r.name', 'SuperAdmin')
  .first();
```

---

## 🧪 Verification

### Expected Database State

After running migrations + seeds:

```
Tables: 5
├── roles (4 records)
├── permissions (54 records)
├── user_roles (0 records) ← Will be populated in Phase 2
├── role_permissions (119 records)
└── organizations (0 records) ← Will be populated in Phase 3
```

### Sample SQL Queries

```sql
-- View all roles
SELECT * FROM roles ORDER BY name;

-- View SuperAdmin permissions
SELECT r.name, p.resource, p.action 
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'SuperAdmin'
ORDER BY p.resource, p.action;

-- Count permissions per role
SELECT r.name, COUNT(rp.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY r.name;

-- View permissions by resource
SELECT resource, COUNT(*) as count
FROM permissions
GROUP BY resource
ORDER BY resource;
```

---

## 📈 Performance

- **Indexes Created**: 12 indexes across all tables
- **Foreign Keys**: 6 foreign key constraints
- **Unique Constraints**: 4 unique constraints
- **Connection Pooling**: Min 2, Max 10 (development) / Max 20 (production)

---

## 🔐 Security Features

1. **UUID Primary Keys** - Prevents ID enumeration
2. **Unique Constraints** - Prevents duplicate role/permission assignments
3. **Foreign Key Cascades** - Automatic cleanup on deletions
4. **System Role Protection** - `is_system` flag prevents deletion
5. **Org-Scoped Access** - `organization_id` in users for multi-tenancy

---

## ⚠️ Important Notes

### SuperAdmin Bypass Logic

SuperAdmin has ALL permissions in database, but **bypass logic** should be implemented in Phase 2 RBACService:

```typescript
// Phase 2 preview
if (user.roles.includes('SuperAdmin')) {
  return true; // Skip permission check entirely
}
```

### Organization Scoping

OrgAdmin and User roles are **org-scoped**. Permission checks in Phase 2 should include:

```typescript
// Phase 2 preview
checkPermission(userId, resource, action, organizationId?)
```

### Auditor Special Case

Auditor has **cross-org read access** for compliance. This should be handled specially in Phase 2.

---

## 🐛 Troubleshooting

### Issue: Migration Fails

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database connection
psql -h localhost -U ibn_user -d ibn_db

# Check .env file
cat .env | grep DB_
```

### Issue: Seed Fails

```bash
# Ensure migrations ran first
npm run db:verify

# Check for existing data conflicts
# Seeds will DELETE existing data in roles/permissions/user_roles/role_permissions
```

### Issue: "Table already exists"

```bash
# Rollback and re-run
npm run knex:rollback
npm run knex:migrate
npm run knex:seed
```

---

## ✅ Phase 1 Completion Criteria

- [x] Knex.js installed and configured
- [x] 5 TypeScript models created
- [x] 5 migrations created and executed
- [x] 3 seed files created and executed
- [x] 4 roles seeded
- [x] 54 permissions seeded
- [x] 119 role-permission mappings created
- [x] Database schema verified
- [x] All indexes and constraints created
- [x] Documentation completed

**Status**: ✅ **100% COMPLETE**

---

## 🚀 Next Steps

Proceed to **Phase 2: RBAC Implementation**

Phase 2 will build:
- `RBACService` class (checkPermission, getUserRoles, getUserPermissions)
- Express middleware (requirePermission, requireRole)
- Role/Permission management routes (/roles, /permissions)
- Integration with existing routes

See [2-RBAC.md](../../doc/v0.0.2/2-RBAC.md) for Phase 2 documentation.

---

**Phase**: 1 of 7  
**Completion**: 100%  
**Next Phase**: Phase 2 - RBAC Implementation  
**Estimated Time**: Phase 1 took ~2 hours to implement
