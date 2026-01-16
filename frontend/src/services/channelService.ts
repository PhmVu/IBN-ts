import api from './api';

export interface Channel {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    created_at: string;
}

export interface ChannelsResponse {
    success: boolean;
    channels: Channel[];
    total: number;
    page: number;
    limit: number;
}

export const ChannelService = {
    /**
     * Get all channels
     */
    async getChannels(page: number = 1, limit: number = 100): Promise<ChannelsResponse> {
        const response = await api.get('/channels', {
            params: { page, limit }
        });
        return response.data;
    },

    /**
     * Get channel by ID
     */
    async getChannelById(id: string): Promise<Channel> {
        const response = await api.get(`/channels/${id}`);
        return response.data.channel;
    },
};
