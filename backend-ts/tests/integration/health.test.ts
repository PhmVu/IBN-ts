import request from 'supertest';

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

import { createApp } from '../../src/app';

describe('Health route', () => {
  it('returns healthy status', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services).toBeDefined();
  });
});
