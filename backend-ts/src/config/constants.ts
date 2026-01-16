export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  AUDITOR: 'auditor',
};

export const PERMISSION_LEVELS = {
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
};

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

export const CHAINCODE_LANGUAGES = {
  GO: 'go',
  JAVA: 'java',
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
};

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  QUERY_CHAINCODE: 'QUERY_CHAINCODE',
  INVOKE_CHAINCODE: 'INVOKE_CHAINCODE',
};

export const RESOURCE_TYPES = {
  USER: 'USER',
  ORGANIZATION: 'ORGANIZATION',
  CHANNEL: 'CHANNEL',
  CHAINCODE: 'CHAINCODE',
  TRANSACTION: 'TRANSACTION',
};
