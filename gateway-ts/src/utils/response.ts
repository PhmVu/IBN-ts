import { ChaincodeResponse } from '@models/chaincode';

/**
 * Response builders and formatters
 */

export class ResponseBuilder {
  /**
   * Build success response
   */
  static success(data: any, txId?: string | null): ChaincodeResponse {
    return {
      success: true,
      data,
      txId: txId || null,
      error: null,
    };
  }

  /**
   * Build error response
   */
  static error(error: string, txId?: string | null): ChaincodeResponse {
    return {
      success: false,
      data: null,
      txId: txId || null,
      error,
    };
  }

  /**
   * Format timestamp
   */
  static timestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Format error message
   */
  static formatErrorMessage(code: string, message: string): string {
    return `[${code}] ${message}`;
  }

  /**
   * Parse chaincode response
   */
  static parseResponse(response: any): any {
    if (!response) {
      return null;
    }

    // Handle JSON string responses
    if (typeof response === 'string') {
      try {
        return JSON.parse(response);
      } catch {
        return response;
      }
    }

    return response;
  }
}
