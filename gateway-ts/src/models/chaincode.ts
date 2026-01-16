import { z } from 'zod';

// Zod schemas for validation

export const ChaincodeForwardRequestSchema = z.object({
  chaincode: z.string().min(1, 'Chaincode name is required'),
  command: z.enum(['query', 'invoke', 'read', 'write', 'update', 'delete']),
  cert: z.string().min(1, 'Certificate is required'),
  msp_id: z.string().optional(),
  private_key: z.string().optional(),
  public_read: z.boolean().optional(),
  org_domain: z.string().optional(),
  args: z.object({
    channel: z.string().min(1, 'Channel name is required'),
    function: z.string().min(1, 'Function name is required'),
    params: z.array(z.string()).optional(),
  }),
});

export type ChaincodeForwardRequest = z.infer<typeof ChaincodeForwardRequestSchema>;

export const ChaincodeResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().nullable(),
  txId: z.string().nullable(),
  error: z.string().nullable(),
});

export type ChaincodeResponse = z.infer<typeof ChaincodeResponseSchema>;

export const HealthStatusSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string(),
  services: z.object({
    gateway: z.boolean(),
    logger: z.boolean(),
  }),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
