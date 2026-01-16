import { query } from '@config/database';
import logger from '@core/logger';

const migrations = [
  {
    name: '001_create_users_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          org_id UUID,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);
    },
  },
  {
    name: '002_create_organizations_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          msp_id VARCHAR(100) UNIQUE NOT NULL,
          domain VARCHAR(255) NOT NULL,
          ca_url VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_orgs_msp_id ON organizations(msp_id);
      `);
    },
  },
  {
    name: '003_create_channels_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS channels (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          created_by UUID NOT NULL REFERENCES users(id),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
        CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);
      `);
    },
  },
  {
    name: '004_create_chaincodes_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS chaincodes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          version VARCHAR(50) NOT NULL,
          channel_id UUID NOT NULL REFERENCES channels(id),
          language VARCHAR(20) NOT NULL,
          path VARCHAR(255) NOT NULL,
          is_installed BOOLEAN DEFAULT false,
          installed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(channel_id, name, version)
        );
        CREATE INDEX IF NOT EXISTS idx_chaincodes_channel ON chaincodes(channel_id);
        CREATE INDEX IF NOT EXISTS idx_chaincodes_name ON chaincodes(name);
      `);
    },
  },
  {
    name: '005_create_transactions_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tx_id VARCHAR(255) UNIQUE NOT NULL,
          channel_id UUID NOT NULL REFERENCES channels(id),
          chaincode_id UUID NOT NULL REFERENCES chaincodes(id),
          function_name VARCHAR(255) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          result JSONB,
          error_message TEXT,
          created_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_transactions_tx_id ON transactions(tx_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_channel ON transactions(channel_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);
      `);
    },
  },
  {
    name: '006_create_audit_logs_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id),
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50) NOT NULL,
          resource_id VARCHAR(255) NOT NULL,
          changes JSONB,
          status VARCHAR(20) DEFAULT 'success',
          error_message TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      `);
    },
  },
];

export async function runMigrations() {
  logger.info('Running database migrations...');

  for (const migration of migrations) {
    try {
      logger.info(`Running migration: ${migration.name}`);
      await migration.up();
      logger.info(`✓ Migration completed: ${migration.name}`);
    } catch (error) {
      logger.error(`✗ Migration failed: ${migration.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  logger.info('All migrations completed successfully');
}

if (require.main === module) {
  runMigrations().catch((error) => {
    logger.error('Migration process failed', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });
}
