import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
// import redis from '../config/redis'; // Unused in current implementation
import logger from '../core/logger';

// Simple in-memory store for development
// In production, you would use Redis store properly
// const store = new Map<string, { count: number; resetTime: number }>();

/* Unused - keeping for future Redis store implementation
function createSimpleStore(prefix: string, windowMs: number) {
    return {
        increment: async (key: string) => {
            const fullKey = `${prefix}${key}`;
            const now = Date.now();
            const data = store.get(fullKey);

            if (!data || data.resetTime < now) {
                store.set(fullKey, { count: 1, resetTime: now + windowMs });
                return { totalHits: 1, resetTime: new Date(now + windowMs) };
            }

            data.count++;
            store.set(fullKey, data);
            return { totalHits: data.count, resetTime: new Date(data.resetTime) };
        },
        decrement: async (key: string) => {
            const fullKey = `${prefix}${key}`;
            const data = store.get(fullKey);
            if (data && data.count > 0) {
                data.count--;
                store.set(fullKey, data);
            }
        },
        resetKey: async (key: string) => {
            store.delete(`${prefix}${key}`);
        }
    };
}
*/

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: {
        success: false,
        error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });

        res.status(429).json({
            success: false,
            error: 'Too many requests, please try again later'
        });
    }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per minute per IP
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true, // Only count failed attempts
    message: {
        success: false,
        error: 'Too many login attempts'
    },
    handler: (req: Request, res: Response) => {
        logger.warn('Auth rate limit exceeded', {
            ip: req.ip,
            username: req.body.username
        });

        res.status(429).json({
            success: false,
            error: 'Too many login attempts, please try again in 1 minute'
        });
    }
});

/**
 * Chaincode invocation rate limiter
 * 20 requests per minute per IP
 * Note: Uses IP-based limiting for security (properly handles IPv6)
 */
export const chaincodeInvokeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    // Removed custom keyGenerator to avoid IPv6 bypass vulnerability
    message: {
        success: false,
        error: 'Too many chaincode invocations'
    },
    handler: (req: Request, res: Response) => {
        logger.warn('Chaincode rate limit exceeded', {
            ip: req.ip,
            userId: (req as any).user?.id,
            path: req.path
        });

        res.status(429).json({
            success: false,
            error: 'Too many chaincode invocations, please try again later'
        });
    }
});
