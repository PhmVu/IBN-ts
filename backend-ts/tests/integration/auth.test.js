"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
jest.mock('../../src/config/database', () => ({
    query: jest.fn(),
    getPool: () => ({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date().toISOString() }] }),
    }),
}));
jest.mock('../../src/services/auth/AuthService', () => ({
    AuthService: {
        login: jest.fn(async (username) => ({
            userId: 'u1',
            username,
            email: `${username}@mail.test`,
            role: 'user',
            token: 'token',
            refreshToken: 'refresh',
        })),
    },
}));
jest.mock('../../src/services/blockchain', () => ({
    gatewayClient: {
        health: jest.fn().mockResolvedValue(true),
    },
}));
const app_1 = require("../../src/app");
describe('Auth routes', () => {
    it('POST /api/v1/auth/login returns token payload', async () => {
        const app = (0, app_1.createApp)();
        const res = await (0, supertest_1.default)(app).post('/api/v1/auth/login').send({ username: 'alice', password: 'secret123' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBe('token');
        expect(res.body.user.username).toBe('alice');
    });
});
//# sourceMappingURL=auth.test.js.map