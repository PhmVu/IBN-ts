import { bruteForceProtection } from '../../../src/services/security/BruteForceProtection';

// Mock Redis
jest.mock('../../../src/config/redis', () => ({
    incr: jest.fn(),
    expire: jest.fn(),
    setex: jest.fn(),
    get: jest.fn(),
    ttl: jest.fn(),
    del: jest.fn(),
}));

const mockRedis = jest.requireMock('../../../src/config/redis');

describe('BruteForceProtection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('recordFailedAttempt', () => {
        it('should increment failed attempts counter', async () => {
            mockRedis.incr.mockResolvedValue(1);
            mockRedis.expire.mockResolvedValue(1);

            await bruteForceProtection.recordFailedAttempt('testuser', '127.0.0.1');

            expect(mockRedis.incr).toHaveBeenCalledWith('failed:testuser:127.0.0.1');
            expect(mockRedis.expire).toHaveBeenCalledWith('failed:testuser:127.0.0.1', 900);
        });

        it('should lock account after 5 failed attempts', async () => {
            mockRedis.incr.mockResolvedValue(5);
            mockRedis.setex.mockResolvedValue('OK');

            await bruteForceProtection.recordFailedAttempt('testuser', '127.0.0.1');

            expect(mockRedis.setex).toHaveBeenCalledWith('locked:testuser:127.0.0.1', 3600, '1');
        });

        it('should not set expiry on subsequent attempts', async () => {
            mockRedis.incr.mockResolvedValue(3);

            await bruteForceProtection.recordFailedAttempt('testuser', '127.0.0.1');

            expect(mockRedis.expire).not.toHaveBeenCalled();
        });
    });

    describe('isLocked', () => {
        it('should return true when account is locked', async () => {
            mockRedis.get.mockResolvedValue('1');

            const result = await bruteForceProtection.isLocked('testuser', '127.0.0.1');

            expect(result).toBe(true);
            expect(mockRedis.get).toHaveBeenCalledWith('locked:testuser:127.0.0.1');
        });

        it('should return false when account is not locked', async () => {
            mockRedis.get.mockResolvedValue(null);

            const result = await bruteForceProtection.isLocked('testuser', '127.0.0.1');

            expect(result).toBe(false);
        });
    });

    describe('getRemainingLockTime', () => {
        it('should return remaining TTL', async () => {
            mockRedis.ttl.mockResolvedValue(1800);

            const result = await bruteForceProtection.getRemainingLockTime('testuser', '127.0.0.1');

            expect(result).toBe(1800);
            expect(mockRedis.ttl).toHaveBeenCalledWith('locked:testuser:127.0.0.1');
        });

        it('should return 0 when no lock exists', async () => {
            mockRedis.ttl.mockResolvedValue(-2);

            const result = await bruteForceProtection.getRemainingLockTime('testuser', '127.0.0.1');

            expect(result).toBe(0);
        });
    });

    describe('clearAttempts', () => {
        it('should delete both failed and locked keys', async () => {
            mockRedis.del.mockResolvedValue(1);

            await bruteForceProtection.clearAttempts('testuser', '127.0.0.1');

            expect(mockRedis.del).toHaveBeenCalledWith('failed:testuser:127.0.0.1');
            expect(mockRedis.del).toHaveBeenCalledWith('locked:testuser:127.0.0.1');
        });
    });

    describe('getAttemptCount', () => {
        it('should return attempt count', async () => {
            mockRedis.get.mockResolvedValue('3');

            const result = await bruteForceProtection.getAttemptCount('testuser', '127.0.0.1');

            expect(result).toBe(3);
            expect(mockRedis.get).toHaveBeenCalledWith('failed:testuser:127.0.0.1');
        });

        it('should return 0 when no attempts recorded', async () => {
            mockRedis.get.mockResolvedValue(null);

            const result = await bruteForceProtection.getAttemptCount('testuser', '127.0.0.1');

            expect(result).toBe(0);
        });
    });
});
