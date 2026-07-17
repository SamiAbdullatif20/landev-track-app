import { defineConfig } from 'vite'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

const packagedEnv = {
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? 'https://landev.vercel.app',
  VITE_APP_ENV: process.env.VITE_APP_ENV ?? 'prod',
  AUTO_UPDATE_ENABLED: process.env.AUTO_UPDATE_ENABLED ?? 'false',
  UPDATE_FEED_URL:
    process.env.UPDATE_FEED_URL ??
    'https://github.com/SamiAbdullatif20/landev-track-app/releases/latest/download',
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        onstart({ startup }) {
          if (process.platform === 'win32') {
            const devElectronPath = pathToFileURL(
              path.join(__dirname, 'scripts', 'dev-electron-path.cjs')
            ).href
            startup(['.', '--no-sandbox'], {}, devElectronPath)
            return
          }
          startup(['.', '--no-sandbox'])
        },
        vite: {
          define: {
            __LANDEV_PACKAGED_ENV__: JSON.stringify(packagedEnv),
          },
          build: {
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: process.env.NODE_ENV === 'test'
        // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
        ? undefined
        : {},
    }),
  ],
})
