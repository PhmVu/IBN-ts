"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GatewayClient_1 = require("../../../src/services/blockchain/GatewayClient");
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("../../../src/core/errors");
jest.mock('axios');
const mockedAxios = axios_1.default;
mockedAxios.create = jest.fn(() => {
    return {
        post: jest.fn(),
        get: jest.fn(),
        defaults: { baseURL: 'http://localhost' },
    };
});
describe('GatewayClient', () => {
    beforeEach(() => jest.clearAllMocks());
    it('query returns data when success', async () => {
        const client = new GatewayClient_1.GatewayClient();
        client.client.post = jest.fn().mockResolvedValue({ data: { success: true } });
        const res = await client.query({
            chaincode: 'cc',
            command: 'query',
            cert: 'c',
            msp_id: 'm',
            args: { channel: 'ch', function: 'f', params: [] },
        });
        expect(res.success).toBe(true);
    });
    it('query throws TimeoutError on ECONNABORTED', async () => {
        const client = new GatewayClient_1.GatewayClient();
        const timeoutError = new Error('timeout');
        timeoutError.code = 'ECONNABORTED';
        mockedAxios.isAxiosError.mockReturnValue(true);
        client.client.post = jest.fn().mockRejectedValue(timeoutError);
        await expect(client.query({ chaincode: 'cc', command: 'query', cert: 'c', msp_id: 'm', args: { channel: 'ch', function: 'f', params: [] } })).rejects.toBeInstanceOf(errors_1.TimeoutError);
    });
    it('query throws GatewayError on other axios error', async () => {
        const client = new GatewayClient_1.GatewayClient();
        const axiosError = new Error('fail');
        axiosError.response = { status: 500, data: {} };
        mockedAxios.isAxiosError.mockReturnValue(true);
        client.client.post = jest.fn().mockRejectedValue(axiosError);
        await expect(client.query({ chaincode: 'cc', command: 'query', cert: 'c', msp_id: 'm', args: { channel: 'ch', function: 'f', params: [] } })).rejects.toBeInstanceOf(errors_1.GatewayError);
    });
});
//# sourceMappingURL=GatewayClient.test.js.map