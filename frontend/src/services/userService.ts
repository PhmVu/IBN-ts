import api from './api';

export interface User {
    id: string;
    username: string;
    email: string;
    organization_id?: string;
    wallet_id?: string;
    enrolled: boolean;
    enrolled_at?: string;
    created_at: string;
    roles?: Array<{
        id: string;
        name: string;
    }>;
}

export interface UsersResponse {
    success: boolean;
    users: User[];
    total: number;
    page: number;
    limit: number;
}

export const UserService = {
    /**
     * Get all users with pagination
     */
    async getUsers(page: number = 0, limit: number = 10): Promise<UsersResponse> {
        const response = await api.get('/users', {
            params: { page, limit }
        });
        return response.data;
    },

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<User> {
        const response = await api.get(`/users/${id}`);
        return response.data.user;
    },

    /**
     * Get user certificate info
     */
    async getUserCertificate(id: string) {
        const response = await api.get(`/users/${id}/certificate`);
        return response.data;
    },

    /**
     * Create new user
     */
    async createUser(data: {
        username: string;
        email: string;
        password: string;
        organization_id?: string;
    }): Promise<User> {
        const response = await api.post('/users', data);
        return response.data.user;
    },

    /**
     * Update user
     */
    async updateUser(id: string, data: Partial<User>): Promise<User> {
        const response = await api.put(`/users/${id}`, data);
        return response.data.user;
    },

    /**
     * Delete user
     */
    async deleteUser(id: string): Promise<void> {
        await api.delete(`/users/${id}`);
    },
};
