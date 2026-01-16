"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AuthService_1 = require("../../../src/services/auth/AuthService");
const errors_1 = require("../../../src/core/errors");
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
    JwtService: {
        generateToken: jest.fn(() => 'token'),
        generateRefreshToken: jest.fn(() => 'refresh'),
    },
}));
const mockQuery = jest.requireMock('../../../src/config/database').query;
const mockPassword = jest.requireMock('../../../src/services/auth/PasswordService').PasswordService
    .comparePassword;
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
        const result = await AuthService_1.AuthService.login('alice', 'secret');
        expect(result).toEqual({
            userId: 'u1',
            username: 'alice',
            email: 'alice@example.com',
            role: 'user',
            token: 'token',
            refreshToken: 'refresh',
        });
    });
    it('throws AuthenticationError when user not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        await expect(AuthService_1.AuthService.login('unknown', 'secret')).rejects.toBeInstanceOf(errors_1.AuthenticationError);
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
        await expect(AuthService_1.AuthService.login('alice', 'wrong')).rejects.toBeInstanceOf(errors_1.AuthenticationError);
    });
});
//# sourceMappingURL=AuthService.test.js.map