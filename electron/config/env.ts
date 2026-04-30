import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url({
    message: "Missing VITE_API_BASE_URL. Set it in your environment before starting the app."
  }),
  VITE_APP_ENV: z.enum(["dev", "staging", "prod"]).default("dev"),
  APP_NAME: z.string().default("LANDev Track"),
  AUTO_UPDATE_ENABLED: z.enum(["true", "false"]).default("false")
});

export type AppEnv = z.infer<typeof envSchema> & { autoUpdateEnabled: boolean };

let cachedEnv: AppEnv | null = null;

export function readEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.parse({
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
    VITE_APP_ENV: process.env.VITE_APP_ENV ?? "dev",
    APP_NAME: process.env.APP_NAME ?? "LANDev Track",
    AUTO_UPDATE_ENABLED: process.env.AUTO_UPDATE_ENABLED ?? "false"
  });

  cachedEnv = {
    ...parsed,
    autoUpdateEnabled: parsed.AUTO_UPDATE_ENABLED === "true"
  };

  return cachedEnv;
}
