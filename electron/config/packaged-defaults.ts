/** Build-time defaults (see vite.config.ts). Used when .env files are missing after install. */
declare const __LANDEV_PACKAGED_ENV__: {
  VITE_API_BASE_URL: string;
  VITE_APP_ENV: string;
  AUTO_UPDATE_ENABLED: string;
};

export function applyPackagedEnvDefaults(): void {
  if (typeof __LANDEV_PACKAGED_ENV__ === "undefined") {
    return;
  }
  const defaults = __LANDEV_PACKAGED_ENV__;
  if (!process.env.VITE_API_BASE_URL?.trim()) {
    process.env.VITE_API_BASE_URL = defaults.VITE_API_BASE_URL;
  }
  if (!process.env.VITE_APP_ENV?.trim()) {
    process.env.VITE_APP_ENV = defaults.VITE_APP_ENV as NodeJS.ProcessEnv["VITE_APP_ENV"];
  }
  if (!process.env.AUTO_UPDATE_ENABLED?.trim()) {
    process.env.AUTO_UPDATE_ENABLED = defaults.AUTO_UPDATE_ENABLED as NodeJS.ProcessEnv["AUTO_UPDATE_ENABLED"];
  }
}
