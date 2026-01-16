import axios, { AxiosInstance } from 'axios';
import logger from '@core/logger';

export interface VaultConfig {
    address: string;
    token: string;
    namespace?: string;
}

export class VaultService {
    private client: AxiosInstance;
    private token: string;

    constructor(config: VaultConfig) {
        this.token = config.token;
        this.client = axios.create({
            baseURL: config.address,
            headers: {
                'X-Vault-Token': this.token,
                ...(config.namespace && { 'X-Vault-Namespace': config.namespace })
            },
            timeout: 5000
        });

        logger.info('VaultService initialized', {
            address: config.address,
            namespace: config.namespace
        });
    }

    /**
     * Read secret from Vault KV v2
     * Path format: secret/data/<path>
     */
    async read<T = any>(path: string): Promise<T | null> {
        try {
            // KV v2 uses /data/ in the path
            const dataPath = path.startsWith('secret/data/') ? path : `secret/data/${path}`;

            const response = await this.client.get(`/v1/${dataPath}`);

            if (response.data && response.data.data && response.data.data.data) {
                logger.debug('Secret read successfully', { path });
                return response.data.data.data as T;
            }

            return null;
        } catch (error: any) {
            if (error.response?.status === 404) {
                logger.warn('Secret not found', { path });
                return null;
            }

            logger.error('Failed to read secret', {
                path,
                error: error.message,
                status: error.response?.status
            });
            throw error;
        }
    }

    /**
     * Write secret to Vault KV v2
     * Path format: secret/data/<path>
     */
    async write(path: string, data: Record<string, any>): Promise<void> {
        try {
            // KV v2 uses /data/ in the path
            const dataPath = path.startsWith('secret/data/') ? path : `secret/data/${path}`;

            await this.client.post(`/v1/${dataPath}`, { data });
            logger.info('Secret written successfully', { path });
        } catch (error: any) {
            logger.error('Failed to write secret', {
                path,
                error: error.message,
                status: error.response?.status
            });
            throw error;
        }
    }

    /**
     * Delete secret from Vault
     */
    async delete(path: string): Promise<void> {
        try {
            const metadataPath = path.startsWith('secret/metadata/')
                ? path
                : `secret/metadata/${path}`;

            await this.client.delete(`/v1/${metadataPath}`);
            logger.info('Secret deleted successfully', { path });
        } catch (error: any) {
            logger.error('Failed to delete secret', {
                path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * List secrets in path (KV v2)
     */
    async list(path: string): Promise<string[]> {
        try {
            const metadataPath = path.startsWith('secret/metadata/')
                ? path
                : `secret/metadata/${path}`;

            const response = await this.client.request({
                method: 'LIST',
                url: `/v1/${metadataPath}`
            });

            return response.data?.data?.keys || [];
        } catch (error: any) {
            if (error.response?.status === 404) {
                return [];
            }

            logger.error('Failed to list secrets', {
                path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/v1/sys/health');
            return response.status === 200;
        } catch (error: any) {
            logger.error('Vault health check failed', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get Vault status info
     */
    async getStatus(): Promise<{
        initialized: boolean;
        sealed: boolean;
        version: string;
    }> {
        try {
            const response = await this.client.get('/v1/sys/health');
            return {
                initialized: response.data.initialized,
                sealed: response.data.sealed,
                version: response.data.version
            };
        } catch (error: any) {
            logger.error('Failed to get Vault status', {
                error: error.message
            });
            throw error;
        }
    }
}

// Singleton instance
let vaultService: VaultService | null = null;

/**
 * Initialize Vault service singleton
 */
export function initVaultService(): VaultService {
    if (!vaultService) {
        const config: VaultConfig = {
            address: process.env.VAULT_ADDR || 'http://vault:8200',
            token: process.env.VAULT_ROOT_TOKEN || 'dev-root-token-ibn'
        };

        vaultService = new VaultService(config);
        logger.info('✅ VaultService singleton initialized');
    }

    return vaultService;
}

/**
 * Get existing Vault service instance
 */
export function getVaultService(): VaultService {
    if (!vaultService) {
        throw new Error('VaultService not initialized. Call initVaultService() first.');
    }

    return vaultService;
}
