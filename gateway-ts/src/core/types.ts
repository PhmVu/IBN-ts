// Core types for Gateway API

export interface OrgContext {
  msp_id: string;
  certificate: string; // Base64 encoded
  private_key?: string; // Base64 encoded (optional)
  public_read?: boolean;
  org_domain?: string;
}

export interface ChaincodeForwardRequest {
  chaincode: string;
  command: 'query' | 'invoke' | 'read' | 'write' | 'update' | 'delete';
  cert: string; // Base64 encoded certificate
  msp_id?: string;
  private_key?: string; // Base64 encoded (required for invoke)
  public_read?: boolean;
  org_domain?: string;
  args: {
    channel: string;
    function: string;
    params?: string[];
  };
}

export interface ChaincodeResponse {
  success: boolean;
  data: any | null;
  txId: string | null;
  error: string | null;
}

export interface FabricIdentityConfig {
  mspId: string;
  certificate: Buffer; // Decoded certificate bytes
  privateKey?: Buffer; // Decoded private key bytes (optional)
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    gateway: boolean;
    logger: boolean;
  };
}

export interface ChannelInfo {
  name: string;
  organizations: string[];
  chaincodes: string[];
  height: number;
  created_at: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}
