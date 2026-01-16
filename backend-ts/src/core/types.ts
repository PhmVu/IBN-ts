export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user' | 'auditor';
  org_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: string;
  name: string;
  msp_id: string;
  domain: string;
  ca_url: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  created_by: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Chaincode {
  id: string;
  name: string;
  version: string;
  channel_id: string;
  language: string;
  path: string;
  is_installed: boolean;
  installed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  tx_id: string;
  channel_id: string;
  chaincode_id: string;
  function_name: string;
  status: 'pending' | 'success' | 'failed';
  result: unknown;
  error_message: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  status: 'success' | 'failed';
  error_message: string | null;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

export interface JwtPayload {
  id?: string;
  sub: string;
  username: string;
  email: string;
  role: string;
  is_superuser: boolean;
  organization_id?: string;
  wallet_id?: string; // v0.0.2: User's wallet identifier
  roles?: Array<{
    id: string;
    name: string;
  }>;
  iat: number;
  exp: number;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
  refreshToken: string;
}

export interface ChaincodeResponse {
  success: boolean;
  data: unknown | null;
  txId: string | null;
  error: string | null;
}
