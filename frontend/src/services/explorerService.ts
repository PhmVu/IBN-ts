import api from './api';

export interface Block {
    block_number: number;
    tx_count: number;
    data_hash: string;
    previous_hash: string;
    timestamp: string;
}

export interface BlocksResponse {
    success: boolean;
    blocks: Block[];
    total: number;
}

export interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime?: number;
    services?: {
        database: string;
        gateway: string;
        api: string;
    };
}

export const ExplorerService = {
    /**
     * Get blockchain health status
     */
    async getHealth(): Promise<HealthResponse> {
        const response = await api.get('/api/v1/health');
        return response.data;
    },

    /**
     * Get blocks from a channel
     */
    async getBlocks(channelId: string, page: number = 0, limit: number = 10): Promise<BlocksResponse> {
        const response = await api.get(`/channels/${channelId}/blocks`, {
            params: { page, limit }
        });
        return response.data;
    },

    /**
     * Get block by number
     */
    async getBlockByNumber(channelId: string, blockNumber: number): Promise<Block> {
        const response = await api.get(`/channels/${channelId}/blocks/${blockNumber}`);
        return response.data.block;
    },
};
