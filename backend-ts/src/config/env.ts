import { z } from 'zod';
import logger from '@core/logger';

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(9002),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('ibn_user'),
  DB_PASSWORD: z.string().default('ibn_password'),
  DB_NAME: z.string().default('ibn_db'),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(10),

  // JWT
  JWT_SECRET: z.string().min(32).default('dev-secret-key-min-32-characters-for-testing'),
  JWT_EXPIRATION: z.string().default('24h'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // Gateway API
  GATEWAY_API_URL: z.string().url().default('http://localhost:9001'),
  GATEWAY_API_TIMEOUT: z.coerce.number().default(30000),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3001,http://localhost:3000'),

  // Features
  AUDIT_LOG_ENABLED: z.string().transform(v => v === 'true').default('true'),
  SWAGGER_ENABLED: z.string().transform(v => v === 'true').default('true'),
});

let env: z.infer<typeof envSchema>;

// Normalize environment variables to avoid CRLF/whitespace issues on Windows
const normalizedEnv: NodeJS.ProcessEnv = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
) as NodeJS.ProcessEnv;

try {
  env = envSchema.parse(normalizedEnv);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Allow test mode to skip strict validation
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Environment validation failed:', error.errors);
      process.exit(1);
    } else {
      logger.warn('Environment validation skipped in test mode');
      // Provide defaults for test
      env = envSchema.parse({
        ...normalizedEnv,
        JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-min-32-characters-for-testing',
      });
    }
  } else {
    throw error;
  }
}

export const config = {
  // Server
  port: env.PORT,
  host: env.HOST,
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',

  // Database
  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    max: env.DB_POOL_MAX,
    min: env.DB_POOL_MIN,
  },

  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRATION,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRATION,
  },

  // Gateway
  gateway: {
    url: env.GATEWAY_API_URL,
    timeout: env.GATEWAY_API_TIMEOUT,
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },

  // CORS
  cors: {
    origin: env.CORS_ORIGIN,
  },

  // Features
  features: {
    auditLog: env.AUDIT_LOG_ENABLED,
    swagger: env.SWAGGER_ENABLED,
  },
};

export default config;
