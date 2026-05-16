import { z } from "zod";
import { isCatalogProjectId } from "../config/role-project-catalog";

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

export const startSchema = z
  .object({
    projectId: z.string().trim(),
    projectName: z.string().trim().optional(),
    isNonChargeable: z.boolean().optional(),
    description: z.string().trim().min(3).max(2000)
  })
  .superRefine((data, ctx) => {
    if (isCatalogProjectId(data.projectId)) {
      if (!data.projectName?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "projectName is required for admin work",
          path: ["projectName"]
        });
      }
      return;
    }
    if (!data.projectId) {
      ctx.addIssue({
        code: "custom",
        message: "Select a project before starting work",
        path: ["projectId"]
      });
    }
  });

export const eventSchema = z.object({
  type: z.string().min(1),
  occurredAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const stopSchema = z.object({
  stoppedAt: z.string()
});
