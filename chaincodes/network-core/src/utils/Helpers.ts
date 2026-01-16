/**
 * Helper utilities for NetworkCore chaincode
 */

import { Context } from 'fabric-contract-api';

/**
 * Helper class for common chaincode operations
 */
export class Helpers {
    /**
     * Get current timestamp in ISO 8601 format
     */
    static getCurrentTimestamp(): string {
        return new Date().toISOString();
    }

    /**
     * Generate unique ID with prefix and timestamp
     */
    static generateId(prefix: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Get caller's MSP ID
     */
    static getCallerMspId(ctx: Context): string {
        const mspId = ctx.clientIdentity.getMSPID();
        if (!mspId) {
            throw new Error('Unable to get caller MSP ID');
        }
        return mspId;
    }

    /**
     * Check if caller is SuperAdmin (IBNMSP)
     */
    static isSuperAdmin(ctx: Context): boolean {
        const mspId = this.getCallerMspId(ctx);
        return mspId === 'IBNMSP';
    }

    /**
     * Require SuperAdmin permission
     */
    static requireSuperAdmin(ctx: Context): void {
        if (!this.isSuperAdmin(ctx)) {
            throw new Error('Only SuperAdmin (IBNMSP) can perform this action');
        }
    }

    /**
     * Get transaction ID
     */
    static getTransactionId(ctx: Context): string {
        return ctx.stub.getTxID();
    }

    /**
     * Check if key exists in ledger
     */
    static async exists(ctx: Context, key: string): Promise<boolean> {
        const data = await ctx.stub.getState(key);
        return data && data.length > 0;
    }

    /**
     * Get data from ledger
     */
    static async getData<T>(ctx: Context, key: string): Promise<T> {
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`Data with key ${key} does not exist`);
        }
        return JSON.parse(data.toString()) as T;
    }

    /**
     * Put data to ledger
     */
    static async putData(ctx: Context, key: string, value: any): Promise<void> {
        const buffer = Buffer.from(JSON.stringify(value));
        await ctx.stub.putState(key, buffer);
    }

    /**
     * Delete data from ledger
     */
    static async deleteData(ctx: Context, key: string): Promise<void> {
        await ctx.stub.deleteState(key);
    }

    /**
     * Query data using CouchDB rich query
     */
    static async queryData<T>(ctx: Context, queryString: string): Promise<T[]> {
        const iterator = await ctx.stub.getQueryResult(queryString);
        const results: T[] = [];

        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            try {
                const record = JSON.parse(strValue) as T;
                results.push(record);
            } catch (err) {
                console.error('Error parsing query result:', err);
            }
            result = await iterator.next();
        }

        await iterator.close();
        return results;
    }

    /**
     * Emit event
     */
    static emitEvent(ctx: Context, eventName: string, payload: any): void {
        const buffer = Buffer.from(JSON.stringify(payload));
        ctx.stub.setEvent(eventName, buffer);
    }

    /**
     * Validate required fields
     */
    static validateRequired(fields: Record<string, any>): void {
        for (const [key, value] of Object.entries(fields)) {
            if (value === undefined || value === null || value === '') {
                throw new Error(`Required field '${key}' is missing or empty`);
            }
        }
    }

    /**
     * Parse JSON safely
     */
    static parseJSON<T>(jsonString: string): T {
        try {
            return JSON.parse(jsonString) as T;
        } catch (error) {
            throw new Error(`Invalid JSON format: ${error}`);
        }
    }

    /**
     * Create composite key
     */
    static createCompositeKey(ctx: Context, objectType: string, attributes: string[]): string {
        return ctx.stub.createCompositeKey(objectType, attributes);
    }

    /**
     * Split composite key
     */
    static splitCompositeKey(ctx: Context, compositeKey: string): { objectType: string; attributes: string[] } {
        return ctx.stub.splitCompositeKey(compositeKey);
    }
}
