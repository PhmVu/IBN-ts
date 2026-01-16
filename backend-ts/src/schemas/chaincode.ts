import { z } from 'zod';

export const ChaincodeQuerySchema = z.object({
  channel: z.string().min(1),
  chaincode: z.string().min(1),
  function: z.string().min(1),
  params: z.array(z.string()).optional().default([]),
});

export const ChaincodeInvokeSchema = z.object({
  channel: z.string().min(1),
  chaincode: z.string().min(1),
  function: z.string().min(1),
  params: z.array(z.string()).optional().default([]),
});

export type ChaincodeQueryInput = z.infer<typeof ChaincodeQuerySchema>;
export type ChaincodeInvokeInput = z.infer<typeof ChaincodeInvokeSchema>;
