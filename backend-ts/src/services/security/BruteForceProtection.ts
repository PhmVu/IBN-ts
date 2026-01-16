import redis from '../../config/redis';
import logger from '../../core/logger';

export class BruteForceProtection {
    private maxAttempts = 5;
    private lockDuration = 3600; // 1 hour in seconds
    private attemptWindow = 900; // 15 minutes in seconds

    /**
     * Record failed login attempt
     */
    async recordFailedAttempt(username: string, ip: string): Promise<void> {
        const key = `failed:${username}:${ip}`;

        try {
            // Increment failed attempts
            const attempts = await redis.incr(key);

            // Set expiry on first attempt
            if (attempts === 1) {
                await redis.expire(key, this.attemptWindow);
            }

            logger.warn('Failed login attempt recorded', {
                username,
                ip,
                attempts,
                maxAttempts: this.maxAttempts
            });

            // Lock account if max attempts exceeded
            if (attempts >= this.maxAttempts) {
                await this.lockAccount(username, ip);
            }
        } catch (error: any) {
            logger.error('Failed to record login attempt', {
                username,
                ip,
                error: error.message
            });
        }
    }

    /**
     * Lock account temporarily
     */
    private async lockAccount(username: string, ip: string): Promise<void> {
        const lockKey = `locked:${username}:${ip}`;

        await redis.setex(lockKey, this.lockDuration, '1');

        logger.warn('Account temporarily locked', {
            username,
            ip,
            duration: this.lockDuration
        });
    }

    /**
     * Check if account is locked
     */
    async isLocked(username: string, ip: string): Promise<boolean> {
        const lockKey = `locked:${username}:${ip}`;
        const locked = await redis.get(lockKey);

        return locked === '1';
    }

    /**
     * Get remaining lock time
     */
    async getRemainingLockTime(username: string, ip: string): Promise<number> {
        const lockKey = `locked:${username}:${ip}`;
        const ttl = await redis.ttl(lockKey);

        return ttl > 0 ? ttl : 0;
    }

    /**
     * Clear failed attempts on successful login
     */
    async clearAttempts(username: string, ip: string): Promise<void> {
        const key = `failed:${username}:${ip}`;
        const lockKey = `locked:${username}:${ip}`;

        await redis.del(key);
        await redis.del(lockKey);

        logger.info('Login attempts cleared', { username, ip });
    }

    /**
     * Get failed attempt count
     */
    async getAttemptCount(username: string, ip: string): Promise<number> {
        const key = `failed:${username}:${ip}`;
        const count = await redis.get(key);

        return count ? parseInt(count) : 0;
    }
}

export const bruteForceProtection = new BruteForceProtection();
