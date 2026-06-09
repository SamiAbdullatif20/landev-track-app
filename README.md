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

## Employee feedback fix pass (desktop)

Single integration surface for picker, live sync, activity, apps used, screenshots, and notification sounds. **Web dashboard sounds are separate** (browser app).

### 1. Project picker

`GET {BASE_URL}/api/projects?limit=200&cursor=…` until `pagination.nextCursor` is null.

| API field | Desktop use |
|-----------|-------------|
| `displayLabel` | **Title** (list row + selected value) |
| `searchLabel` | **Search** (address; also `clientName`, `projectNumber`) |
| `name`, `projectNumber`, `projectAddress`, `clientName`, `id`, `isNonChargeable` | Stored / fallbacks |

Refresh on picker open and after project change; background sync every **60s**.

### 2. Live sync (no restart)

| What | Interval | Endpoint |
|------|----------|----------|
| Projects | **60s** (60–120s) | Full paginated `GET /api/projects` → replace local cache when ids change → `tracking:projects-push` |
| Events | **45s** (30–60s) | `POST /api/tracking/events/batch` — `INPUT_ACTIVITY`, `APP_FOCUS`, `HEARTBEAT` |
| Auth | On 401 | Re-login with saved credentials, retry once |

### 3. INPUT_ACTIVITY (mouse / keyboard)

While session is active, main process samples every **15s** (polls input every 1s on Windows):

- `eventKind`: `INPUT_ACTIVITY`
- `projectId`, `workSessionId`, `workDateKey`, `occurredAtIso`
- `mouseMoveCount`, `keyPressCount`, `metadata.mouseMovePercent` (+ `totalSamples`, `mouseMoveSamples`, `trackerElapsedMs`)
- Foreground `application`, `processName`, `windowTitle` in metadata

Log: `input-activity-sample`

### 4. APP_FOCUS (apps used)

- **3s** foreground change detection + **15s** tick for same app
- `application`, `processName`, `windowTitle`, `applicationDisplayName`, `executablePath`
- When **Landev** is foreground, keeps reporting last real app (CAD, Chrome) via sticky context

Log: `app-focus-sample`

### 5. Screenshots

- **6 min** (super admin only) + **10 min** (super admin + employees) while session active
- Main-process `desktopCapturer` (PNG) — **not** local video
- `POST /api/tracking/screenshots/ingest` **multipart** `image` field
- Continues while tracker window is open (`backgroundThrottling: false`, power save blocker)

Log: `screenshot-uploaded`

### 6. Desktop notification sounds

| Event | When |
|-------|------|
| `assignment_alert` | New project id from sync |
| `session_reminder` | Every 2h while tracking |
| `sync_failure` | Batch failed with queued items (max 1 / 5 min) |

Bundled `.wav` via `System.Media.SoundPlayer`; toast via `electron.Notification` (AUMID `com.landev.track`). Header **Sounds** toggle.

## Manual test checklist

1. **New project on web** — Super admin assigns project, finalizes from draft. Desktop logged in: open picker or wait **&lt; 2 min** → new row shows `displayLabel`; search by address via `searchLabel`.
2. **5 min in AutoCAD** — Start session, use AutoCAD ~5 min (tracker can stay open). Web session report: **Apps used** shows AutoCAD (`acad.exe`, drawing title).
3. **Activity** — Move mouse / type; web report shows mouse/keyboard stats from `INPUT_ACTIVITY` batch.
4. **Screenshots** — Keep tracker window open **15+ min**; web admin shows screenshots at 6/10 min intervals without app restart.
5. **Sync** — Disconnect network briefly → `sync_failure` sound (if enabled); reconnect → `sync-batch-delivered`.

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
