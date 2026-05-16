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

## Work day start, late-start gate, and time zones

The web app gates **DESIGNER** and **MODERATOR** users via `GET /api/late-start/status` (local work date from `EmployeeCostSetting.timezone`, default UTC). Bands use **local** wall time from `startTime` or `firstActivityTime`. For the gate to see a correct first start instant, the employee’s **desktop “Start”** must persist a **WorkSession** (or equivalent) with **`startTime` in UTC** aligned to when they actually began work.

### What the desktop sends on **Start**

Auth is the same as all other main-process calls: **Bearer token** (if returned by login) and/or **`Cookie`** header from the persisted session cookie.

**Primary (preferred for WorkSession / late-start):**

| Step | Method | URL |
|------|--------|-----|
| 1 | `POST` | `{VITE_API_BASE_URL}/api/tracking/session/start` |

**JSON body (application/json):**

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | string | Selected project id |
| `description` | string | Work details (trimmed) |
| `workDetails` | string | Same as `description` (compat) |
| `work_details` | string | Same as `description` (compat) |
| `details` | string | Same as `description` (compat) |
| `clientTimeZone` | string | IANA zone from the OS (e.g. `Pacific/Auckland`, `Europe/Istanbul`) |
| `startTime` | string | ISO-8601 **UTC** instant when the user pressed Start |
| `startedAt` | string | Same instant (compat alias) |
| `occurredAt` | string | Same instant (compat alias) |

If that route returns **404** (not deployed), the desktop **falls back** to:

| Step | Method | URL |
|------|--------|-----|
| 2 | `POST` | `{VITE_API_BASE_URL}/api/attendance/today` |

**JSON body:** `action: "start"` plus the same fields as above (including `startTime` / `startedAt` / `occurredAt` / `clientTimeZone`).

**Stop** still uses `POST /api/attendance/today` with `action: "end"`, `stoppedAt`, and optional `clientTimeZone`.

### Employee / HR note

If a user will be in the **orange** or **red** late-start band for their role, they should **press Start in the desktop tracker first** (so `startTime` exists before opening the web app), unless the web flow creates the session another way. Otherwise the browser may redirect to late attestation until rules are satisfied.

### Backend checklist

- Implement or proxy `POST /api/tracking/session/start` to create/update **today’s WorkSession** with `startTime` = body `startTime` (UTC) and respect `clientTimeZone` for the work **date** used by `GET /api/late-start/status`.
- If you only use `POST /api/attendance/today`, accept the same `startTime` / `clientTimeZone` fields on `action: "start"` and persist them identically.
- Do **not** run two independent start flows that each create a session for the same day (pick one canonical route or dedupe server-side).

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
