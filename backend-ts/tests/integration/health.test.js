"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
jest.mock('../../src/config/database', () => ({
    getPool: () => ({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date().toISOString() }] }),
    }),
    closePool: jest.fn(),
}));
jest.mock('../../src/services/blockchain', () => ({
    gatewayClient: {
        health: jest.fn().mockResolvedValue(true),
    },
}));
const app_1 = require("../../src/app");
describe('Health route', () => {
    it('returns healthy status', async () => {
        const app = (0, app_1.createApp)();
        const res = await (0, supertest_1.default)(app).get('/api/v1/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('healthy');
        expect(res.body.services).toBeDefined();
    });
});
//# sourceMappingURL=health.test.js.map