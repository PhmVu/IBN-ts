"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UserService_1 = require("../../../src/services/user/UserService");
const errors_1 = require("../../../src/core/errors");
jest.mock('../../../src/config/database', () => ({ query: jest.fn() }));
const mockQuery = jest.requireMock('../../../src/config/database').query;
jest.mock('../../../src/services/auth/PasswordService', () => ({
    PasswordService: {
        hashPassword: jest.fn(() => 'hashed'),
    },
}));
describe('UserService.getUserById', () => {
    beforeEach(() => jest.clearAllMocks());
    it('returns user when found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'alice' }] });
        const user = await UserService_1.UserService.getUserById('u1');
        expect(user.id).toBe('u1');
    });
    it('throws NotFoundError when missing', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        await expect(UserService_1.UserService.getUserById('missing')).rejects.toBeInstanceOf(errors_1.NotFoundError);
    });
});
describe('UserService.createUser', () => {
    beforeEach(() => jest.clearAllMocks());
    it('creates user and returns row', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 'u1',
                    username: 'alice',
                    email: 'alice@example.com',
                    role: 'user',
                    org_id: null,
                    is_active: true,
                    created_at: 'now',
                    updated_at: 'now',
                },
            ],
        });
        const user = await UserService_1.UserService.createUser({
            username: 'alice',
            email: 'alice@example.com',
            password: 'Secret123!',
            role: 'user',
        });
        expect(user.username).toBe('alice');
    });
    it('throws DatabaseError on query failure', async () => {
        mockQuery.mockRejectedValueOnce(new Error('db down'));
        await expect(UserService_1.UserService.createUser({
            username: 'bob',
            email: 'bob@example.com',
            password: 'Secret123!',
            role: 'user',
        })).rejects.toBeInstanceOf(errors_1.DatabaseError);
    });
});
//# sourceMappingURL=UserService.test.js.map