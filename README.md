# LANDev Track Desktop

Electron + TypeScript desktop tracker integrated with existing web backend users and tracking workflow.

## Connect to Existing Backend

1. Set backend URL in environment:
   - Copy `.env.example` to `.env`
   - Set `VITE_API_BASE_URL` to your existing backend base URL
   - Optional: set `VITE_APP_ENV` (`dev|staging|prod`)
2. Install dependencies:
   - `npm install`
3. Run desktop app:
   - `npm run dev`
4. Login using existing web credentials.

## Backend/CORS Notes

- Preferred architecture in this app: backend calls are made from Electron main process over IPC bridge.
- This reduces renderer CORS issues and keeps auth/session data out of renderer.
- If you choose cookie auth directly from renderer in future, backend CORS must explicitly allow desktop origin and credentials.
- Desktop app reuses the same backend users as web app.

## Environment Profiles

- `.env.dev`
- `.env.staging`
- `.env.prod`

## Quality Commands

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Packaging (Windows NSIS)

- Installer output: `release/<version>/LANDev Track-Windows-<version>-Setup.exe`
- Replace placeholder icons in `build/icons/` before release.
- Configure code signing in CI with `CSC_LINK` and `CSC_KEY_PASSWORD`.

## Installer Testing Checklist

- Fresh install and first launch
- Login with existing backend user
- Start/stop session and verify backend records
- Offline queue then online sync drain
- Uninstall/reinstall behavior
