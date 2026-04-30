import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

export const startSchema = z.object({
  projectId: z.string().min(1),
  description: z.string().min(10)
});

export const eventSchema = z.object({
  type: z.string().min(1),
  occurredAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const stopSchema = z.object({
  stoppedAt: z.string()
});
