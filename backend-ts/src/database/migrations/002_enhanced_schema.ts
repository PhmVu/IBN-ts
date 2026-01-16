import { query } from '@config/database';

const migrations = [
  {
    name: '006_enhance_organizations_table',
    up: async () => {
      await query(`
        -- Add description and config columns to organizations
        ALTER TABLE organizations 
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;
        
        -- Update users table to link to organizations
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
        
        CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
      `);
    },
    down: async () => {
      await query(`
        ALTER TABLE users DROP COLUMN IF EXISTS organization_id;
        ALTER TABLE organizations DROP COLUMN IF EXISTS description, DROP COLUMN IF EXISTS config;
      `);
    },
  },
  // Note: audit_logs table is created in 001_init.ts; do not duplicate here
  {
    name: '008_create_permissions_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS permissions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          resource VARCHAR(100) NOT NULL,
          action VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
        
        -- Insert default permissions (safe with ON CONFLICT)
        INSERT INTO permissions (name, description, resource, action) VALUES
          ('users:read', 'Read user data', 'users', 'read'),
          ('users:create', 'Create new users', 'users', 'create'),
          ('users:update', 'Update user data', 'users', 'update'),
          ('users:delete', 'Delete users', 'users', 'delete'),
          ('organizations:read', 'Read organization data', 'organizations', 'read'),
          ('organizations:create', 'Create organizations', 'organizations', 'create'),
          ('organizations:update', 'Update organizations', 'organizations', 'update'),
          ('organizations:delete', 'Delete organizations', 'organizations', 'delete'),
          ('organizations:manage', 'Manage organizations', 'organizations', 'manage'),
          ('channels:read', 'Read channel data', 'channels', 'read'),
          ('channels:create', 'Create channels', 'channels', 'create'),
          ('channels:update', 'Update channels', 'channels', 'update'),
          ('channels:delete', 'Delete channels', 'channels', 'delete'),
          ('chaincodes:read', 'Read chaincode data', 'chaincodes', 'read'),
          ('chaincodes:deploy', 'Deploy chaincodes', 'chaincodes', 'deploy'),
          ('transactions:read', 'Read transaction data', 'transactions', 'read'),
          ('transactions:invoke', 'Invoke chaincode', 'transactions', 'invoke'),
          ('transactions:query', 'Query chaincode', 'transactions', 'query'),
          ('certificates:read', 'Read certificate data', 'certificates', 'read'),
          ('certificates:manage', 'Manage certificates', 'certificates', 'manage'),
          ('roles:read', 'Read role data', 'roles', 'read'),
          ('roles:manage', 'Manage roles', 'roles', 'manage'),
          ('permissions:read', 'Read permissions', 'permissions', 'read'),
          ('permissions:manage', 'Manage permissions', 'permissions', 'manage'),
          ('audit:read', 'Read audit logs', 'audit', 'read')
        ON CONFLICT (name) DO NOTHING;
      `);
    },
    down: async () => {
      await query('DROP TABLE IF EXISTS permissions CASCADE;');
    },
  },
  {
    name: '009_create_roles_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS roles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          is_system BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
        
        -- Insert default roles (matching RBAC system)
        INSERT INTO roles (name, description, is_system) VALUES
          ('SuperAdmin', 'System administrator with full access', true),
          ('OrgAdmin', 'Organization administrator', true),
          ('User', 'Regular user with limited access', true),
          ('Auditor', 'Read-only auditor access', true)
        ON CONFLICT (name) DO NOTHING;
      `);
    },
    down: async () => {
      await query('DROP TABLE IF EXISTS roles CASCADE;');
    },
  },
  {
    name: '010_create_role_permissions_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(role_id, permission_id)
        );
        CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
        CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
        
        -- Assign all permissions to SuperAdmin role by default
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r CROSS JOIN permissions p
        WHERE r.name = 'SuperAdmin'
        ON CONFLICT (role_id, permission_id) DO NOTHING;
      `);
    },
    down: async () => {
      await query('DROP TABLE IF EXISTS role_permissions CASCADE;');
    },
  },
  {
    name: '011_create_sessions_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) UNIQUE NOT NULL,
          ip_address VARCHAR(45),
          user_agent TEXT,
          is_active BOOLEAN DEFAULT true,
          expires_at TIMESTAMP NOT NULL,
          last_accessed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
      `);
    },
    down: async () => {
      await query('DROP TABLE IF EXISTS sessions CASCADE;');
    },
  },
];

export default migrations;
