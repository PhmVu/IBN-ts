/**
 * Validation Utilities for TeaTrace Chaincode
 * Provides validation functions for all data inputs
 */

import { TeaStatus, TransferType, QualityResult, CertStatus } from '../models/interfaces';

/**
 * Validate Batch ID format
 * Format: TEA-YYYY-NNN (e.g., TEA-2025-001)
 */
export function validateBatchId(batchId: string): { valid: boolean; error?: string } {
    if (!batchId || typeof batchId !== 'string') {
        return { valid: false, error: 'Batch ID is required and must be a string' };
    }

    const pattern = /^TEA-\d{4}-\d{3,}$/;
    if (!pattern.test(batchId)) {
        return {
            valid: false,
            error: 'Batch ID must follow format: TEA-YYYY-NNN (e.g., TEA-2025-001)'
        };
    }

    return { valid: true };
}

/**
 * Validate quantity
 */
export function validateQuantity(quantity: number, unit: string): { valid: boolean; error?: string } {
    if (typeof quantity !== 'number' || quantity <= 0) {
        return { valid: false, error: 'Quantity must be a positive number' };
    }

    const validUnits = ['kg', 'ton', 'lb', 'g'];
    if (!validUnits.includes(unit)) {
        return {
            valid: false,
            error: `Unit must be one of: ${validUnits.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Validate location (GPS coordinates or address)
 */
export function validateLocation(location: string): { valid: boolean; error?: string } {
    if (!location || typeof location !== 'string') {
        return { valid: false, error: 'Location is required and must be a string' };
    }

    if (location.trim().length < 3) {
        return { valid: false, error: 'Location must be at least 3 characters' };
    }

    return { valid: true };
}

/**
 * Validate tea type
 */
export function validateTeaType(teaType: string): { valid: boolean; error?: string } {
    const validTypes = ['Green', 'Black', 'Oolong', 'White', 'Pu-erh', 'Yellow', 'Dark'];

    if (!validTypes.includes(teaType)) {
        return {
            valid: false,
            error: `Tea type must be one of: ${validTypes.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Validate tea status
 */
export function validateTeaStatus(status: string): { valid: boolean; error?: string } {
    const validStatuses: TeaStatus[] = [
        'HARVESTED',
        'IN_PROCESSING',
        'PROCESSED',
        'IN_PACKAGING',
        'PACKAGED',
        'IN_TRANSIT',
        'IN_WAREHOUSE',
        'IN_RETAIL',
        'SOLD',
        'CONSUMED'
    ];

    if (!validStatuses.includes(status as TeaStatus)) {
        return {
            valid: false,
            error: `Status must be one of: ${validStatuses.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Validate status transition
 * Ensures status changes follow the correct flow
 */
export function validateStatusTransition(
    currentStatus: TeaStatus,
    newStatus: TeaStatus
): { valid: boolean; error?: string } {
    const transitions: Record<TeaStatus, TeaStatus[]> = {
        'HARVESTED': ['IN_PROCESSING'],
        'IN_PROCESSING': ['PROCESSED'],
        'PROCESSED': ['IN_PACKAGING'],
        'IN_PACKAGING': ['PACKAGED'],
        'PACKAGED': ['IN_TRANSIT', 'IN_WAREHOUSE'],
        'IN_TRANSIT': ['IN_WAREHOUSE', 'IN_RETAIL'],
        'IN_WAREHOUSE': ['IN_TRANSIT', 'IN_RETAIL'],
        'IN_RETAIL': ['SOLD'],
        'SOLD': ['CONSUMED'],
        'CONSUMED': []
    };

    const allowedTransitions = transitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
        return {
            valid: false,
            error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
        };
    }

    return { valid: true };
}

/**
 * Validate transfer type
 */
export function validateTransferType(transferType: string): { valid: boolean; error?: string } {
    const validTypes: TransferType[] = ['SALE', 'PROCESSING', 'PACKAGING', 'DISTRIBUTION', 'RETAIL'];

    if (!validTypes.includes(transferType as TransferType)) {
        return {
            valid: false,
            error: `Transfer type must be one of: ${validTypes.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Validate ISO 8601 date string
 */
export function validateISODate(dateString: string): { valid: boolean; error?: string } {
    if (!dateString || typeof dateString !== 'string') {
        return { valid: false, error: 'Date is required and must be a string' };
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return { valid: false, error: 'Invalid ISO 8601 date format' };
    }

    return { valid: true };
}

/**
 * Validate quality result
 */
export function validateQualityResult(result: string): { valid: boolean; error?: string } {
    const validResults: QualityResult[] = ['PASSED', 'FAILED', 'CONDITIONAL'];

    if (!validResults.includes(result as QualityResult)) {
        return {
            valid: false,
            error: `Quality result must be one of: ${validResults.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Validate certification status
 */
export function validateCertStatus(status: string): { valid: boolean; error?: string } {
    const validStatuses: CertStatus[] = ['VALID', 'EXPIRED', 'REVOKED'];

    if (!validStatuses.includes(status as CertStatus)) {
        return {
            valid: false,
            error: `Certification status must be one of: ${validStatuses.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Validate MSP ID format
 * Format: OrgNameMSP (e.g., Farm1MSP, Processor1MSP)
 */
export function validateMSPId(mspId: string): { valid: boolean; error?: string } {
    if (!mspId || typeof mspId !== 'string') {
        return { valid: false, error: 'MSP ID is required and must be a string' };
    }

    if (!mspId.endsWith('MSP')) {
        return { valid: false, error: 'MSP ID must end with "MSP"' };
    }

    if (mspId.length < 4) {
        return { valid: false, error: 'MSP ID is too short' };
    }

    return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required and must be a string' };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
}

/**
 * Validate required string field
 */
export function validateRequiredString(
    value: any,
    fieldName: string,
    minLength: number = 1
): { valid: boolean; error?: string } {
    if (!value || typeof value !== 'string') {
        return { valid: false, error: `${fieldName} is required and must be a string` };
    }

    if (value.trim().length < minLength) {
        return {
            valid: false,
            error: `${fieldName} must be at least ${minLength} characters`
        };
    }

    return { valid: true };
}

/**
 * Validate required number field
 */
export function validateRequiredNumber(
    value: any,
    fieldName: string,
    min?: number,
    max?: number
): { valid: boolean; error?: string } {
    if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: `${fieldName} must be a valid number` };
    }

    if (min !== undefined && value < min) {
        return { valid: false, error: `${fieldName} must be at least ${min}` };
    }

    if (max !== undefined && value > max) {
        return { valid: false, error: `${fieldName} must be at most ${max}` };
    }

    return { valid: true };
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: Array<{ valid: boolean; error?: string }>): { valid: boolean; errors: string[] } {
    const errors = results
        .filter(r => !r.valid)
        .map(r => r.error!)
        .filter(Boolean);

    return {
        valid: errors.length === 0,
        errors
    };
}
