import { z } from "zod";
import { logger } from "./logger";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_ENV: z.enum(["dev", "staging", "prod"]).default("dev"),
  APP_NAME: z.string().default("LANDEV Tracker"),
  AUTO_UPDATE_ENABLED: z.enum(["true", "false"]).default("false")
});

export type AppEnv = z.infer<typeof envSchema> & { autoUpdateEnabled: boolean };

let cachedEnv: AppEnv | null = null;

export function readEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const configuredApiBaseUrl = process.env.VITE_API_BASE_URL;
  const fallbackApiBaseUrl = "http://localhost:3000";
  if (!configuredApiBaseUrl) {
    logger.warn("missing-api-base-url-using-fallback", { fallbackApiBaseUrl });
  }

  const parsed = envSchema.parse({
    VITE_API_BASE_URL: configuredApiBaseUrl ?? fallbackApiBaseUrl,
    VITE_APP_ENV: process.env.VITE_APP_ENV ?? "dev",
    APP_NAME: process.env.APP_NAME ?? "LANDEV Tracker",
    AUTO_UPDATE_ENABLED: process.env.AUTO_UPDATE_ENABLED ?? "false"
  });

  cachedEnv = {
    ...parsed,
    autoUpdateEnabled: parsed.AUTO_UPDATE_ENABLED === "true"
  };

  return cachedEnv;
}
