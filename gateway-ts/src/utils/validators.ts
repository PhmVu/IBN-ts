import { ChaincodeForwardRequest } from '@models/chaincode';
import { ValidationError } from '@core/errors';

/**
 * Validators for chaincode requests
 */

export class ChaincodeValidator {
  /**
   * Validate chaincode forward request
   */
  static validateForwardRequest(request: ChaincodeForwardRequest): void {
    this.validateChaincode(request.chaincode);
    this.validateCommand(request.command);
    this.validateCertificate(request.cert);
    this.validateArgs(request.args);

    // Command-specific validation
    if (request.command !== 'query' && request.command !== 'read') {
      this.validateInvokeRequest(request);
    }
  }

  /**
   * Validate chaincode name
   */
  static validateChaincode(chaincode: string): void {
    if (!chaincode || chaincode.trim().length === 0) {
      throw new ValidationError('Chaincode name is required');
    }

    if (chaincode.length > 255) {
      throw new ValidationError('Chaincode name is too long (max 255 characters)');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(chaincode)) {
      throw new ValidationError(
        'Chaincode name can only contain letters, numbers, hyphens, and underscores'
      );
    }
  }

  /**
   * Validate command
   */
  static validateCommand(command: string): void {
    const validCommands = ['query', 'invoke', 'read', 'write', 'update', 'delete'];

    if (!validCommands.includes(command)) {
      throw new ValidationError(`Invalid command. Must be one of: ${validCommands.join(', ')}`);
    }
  }

  /**
   * Validate certificate
   */
  static validateCertificate(cert: string): void {
    if (!cert || cert.trim().length === 0) {
      throw new ValidationError('Certificate is required');
    }

    if (cert.length > 10000) {
      throw new ValidationError('Certificate is too large (max 10000 characters)');
    }

    // Check if it's valid Base64
    try {
      Buffer.from(cert, 'base64');
    } catch {
      throw new ValidationError('Certificate must be valid Base64 encoded');
    }
  }

  /**
   * Validate invoke request (requires private key)
   */
  static validateInvokeRequest(request: ChaincodeForwardRequest): void {
    if (!request.private_key) {
      throw new ValidationError('Private key is required for invoke operations');
    }

    if (request.private_key.length > 10000) {
      throw new ValidationError('Private key is too large (max 10000 characters)');
    }

    // Check if it's valid Base64
    try {
      Buffer.from(request.private_key, 'base64');
    } catch {
      throw new ValidationError('Private key must be valid Base64 encoded');
    }
  }

  /**
   * Validate chaincode arguments
   */
  static validateArgs(args: any): void {
    if (!args || typeof args !== 'object') {
      throw new ValidationError('Args must be an object');
    }

    if (!args.channel || args.channel.trim().length === 0) {
      throw new ValidationError('Channel name is required');
    }

    if (args.channel.length > 255) {
      throw new ValidationError('Channel name is too long (max 255 characters)');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(args.channel)) {
      throw new ValidationError(
        'Channel name can only contain letters, numbers, hyphens, and underscores'
      );
    }

    if (!args.function || args.function.trim().length === 0) {
      throw new ValidationError('Function name is required');
    }

    if (args.function.length > 255) {
      throw new ValidationError('Function name is too long (max 255 characters)');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(args.function)) {
      throw new ValidationError(
        'Function name can only contain letters, numbers, hyphens, and underscores'
      );
    }

    // Validate params
    if (args.params) {
      if (!Array.isArray(args.params)) {
        throw new ValidationError('Params must be an array');
      }

      if (args.params.length > 100) {
        throw new ValidationError('Too many parameters (max 100)');
      }

      args.params.forEach((param: any, index: number) => {
        if (typeof param !== 'string') {
          throw new ValidationError(`Parameter ${index} must be a string`);
        }

        if (param.length > 10000) {
          throw new ValidationError(`Parameter ${index} is too long (max 10000 characters)`);
        }
      });
    }
  }

  /**
   * Validate channel name
   */
  static validateChannel(channel: string): void {
    if (!channel || channel.trim().length === 0) {
      throw new ValidationError('Channel name is required');
    }

    if (channel.length > 255) {
      throw new ValidationError('Channel name is too long (max 255 characters)');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(channel)) {
      throw new ValidationError(
        'Channel name can only contain letters, numbers, hyphens, and underscores'
      );
    }
  }

  /**
   * Validate MSP ID
   */
  static validateMspId(mspId: string): void {
    if (!mspId || mspId.trim().length === 0) {
      throw new ValidationError('MSP ID is required');
    }

    if (mspId.length > 255) {
      throw new ValidationError('MSP ID is too long (max 255 characters)');
    }
  }
}
