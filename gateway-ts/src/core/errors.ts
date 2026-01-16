// Custom errors for Gateway API

export class GatewayError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

export class CertificateError extends GatewayError {
  constructor(message: string, details?: any) {
    super('CERTIFICATE_ERROR', message, 400, details);
    this.name = 'CertificateError';
  }
}

export class ValidationError extends GatewayError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class FabricError extends GatewayError {
  constructor(message: string, statusCode: number = 500, details?: any) {
    super('FABRIC_ERROR', message, statusCode, details);
    this.name = 'FabricError';
  }
}

export class NetworkError extends GatewayError {
  constructor(message: string, details?: any) {
    super('NETWORK_ERROR', message, 503, details);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends GatewayError {
  constructor(message: string, details?: any) {
    super('TIMEOUT_ERROR', message, 504, details);
    this.name = 'TimeoutError';
  }
}
