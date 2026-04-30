/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string;
    VITE_PUBLIC: string;
    VITE_API_BASE_URL: string;
    APP_NAME?: string;
    VITE_APP_ENV?: "dev" | "staging" | "prod";
    AUTO_UPDATE_ENABLED?: "true" | "false";
  }
}
