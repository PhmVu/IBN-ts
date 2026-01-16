import { AuthService } from '../../../src/services/auth/AuthService';
import { AuthenticationError } from '../../../src/core/errors';

jest.mock('../../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../src/services/auth/PasswordService', () => ({
  PasswordService: {
    comparePassword: jest.fn(),
    hashPassword: jest.fn(),
    validatePasswordStrength: jest.fn(() => ({ isValid: true, errors: [] })),
  },
}));

jest.mock('../../../src/services/auth/JwtService', () => ({
  jwtService: {
    generateToken: jest.fn(() => Promise.resolve('token')),
    generateRefreshToken: jest.fn(() => 'refresh'),
  },
}));

jest.mock('../../../src/services/security', () => ({
  bruteForceProtection: {
    isLocked: jest.fn(() => Promise.resolve(false)),
    recordFailedAttempt: jest.fn(() => Promise.resolve()),
    clearAttempts: jest.fn(() => Promise.resolve()),
    getAttemptCount: jest.fn(() => Promise.resolve(0)),
  },
}));

const mockQuery = jest.requireMock('../../../src/config/database').query as jest.Mock;
const mockPassword = jest.requireMock('../../../src/services/auth/PasswordService').PasswordService
  .comparePassword as jest.Mock;

describe('AuthService.login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tokens when credentials are valid', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'u1',
          username: 'alice',
          email: 'alice@example.com',
          password_hash: 'hash',
          role: 'user',
        },
      ],
    });
    mockPassword.mockResolvedValueOnce(true);

    const result = await AuthService.login('alice', 'secret');

    expect(result).toEqual({
      userId: 'u1',
      username: 'alice',
      email: 'alice@example.com',
      role: 'user',
      token: 'token',
      refreshToken: 'refresh',
      enrolled: false,
      walletId: null,
      certificateSerial: null,
    });
  });

  it('throws AuthenticationError when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(AuthService.login('unknown', 'secret')).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('throws AuthenticationError when password invalid', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'u1',
          username: 'alice',
          email: 'alice@example.com',
          password_hash: 'hash',
          role: 'user',
        },
      ],
    });
    mockPassword.mockResolvedValueOnce(false);

    await expect(AuthService.login('alice', 'wrong')).rejects.toBeInstanceOf(AuthenticationError);
  });
});
