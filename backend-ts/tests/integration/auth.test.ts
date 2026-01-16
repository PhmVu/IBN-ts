import request from 'supertest';

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  getPool: () => ({
    query: jest.fn().mockResolvedValue({ rows: [{ now: new Date().toISOString() }] }),
  }),
}));

jest.mock('../../src/services/auth/AuthService', () => ({
  AuthService: {
    login: jest.fn(async (username: string) => ({
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

import { createApp } from '../../src/app';

describe('Auth routes', () => {
  it('POST /api/v1/auth/login returns token payload', async () => {
    const app = createApp();
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'alice', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('token');
    expect(res.body.user.username).toBe('alice');
  });
});
