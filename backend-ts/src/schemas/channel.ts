import { z } from 'zod';

export const ChannelSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

export const UpdateChannelSchema = z.object({
  description: z.string().optional(),
});

export type CreateChannelInput = z.infer<typeof ChannelSchema>;
export type UpdateChannelInput = z.infer<typeof UpdateChannelSchema>;
