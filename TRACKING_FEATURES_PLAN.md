# Landev Tracker — Feature Plan (Desktop + Web)

## Goals

| Feature | Target |
|---------|--------|
| Screenshots | 6 min → super admin only; 10 min → admin + employees; JPEG compressed before upload |
| Apps used | Real app names (not PowerShell); exact minutes from summed `activeSeconds` |
| Mouse activity | `mouseMovePercent` on each INPUT_ACTIVITY sample; web shows day average % |

---

## Desktop (this repo) — implemented

### Screenshots
- `electron/services/screenshot-schedules.ts` — 6 / 10 minute tiers + `visibleToRoles`
- `electron/services/screenshot-compress.ts` — PNG → JPEG via `nativeImage.toJPEG`
- `electron/services/screenshot-worker.ts` — uploads JPEG with compression metadata
- Main-process timers while session active

### Apps used
- `electron/services/foreground-probe-windows.ts` — persistent probe (no PowerShell stealing focus)
- `electron/services/activity-metadata.ts` — uses persistent probe; fixed `$procId` (not `$pid`)
- `electron/services/tracking-app-focus.ts` — filters PowerShell/cmd/conhost/Landev; `applicationDisplayName`
- `electron/services/app-focus-poller.ts` — credits **leaving** app on switch; 15s ticks for same app; sticky when tracker focused

### Mouse movement
- `electron/services/input-probe-windows.ts` — persistent global input probe
- `electron/services/input-activity-sampler.ts` — 15s INPUT_ACTIVITY with `mouseMovePercent`
- `electron/services/tracking-input-activity.ts` — batch payload with session fields

### Session lifecycle
- `electron/services/probe-session-lifecycle.ts` — warm-up probes on Start; kill on Stop
- `electron/ipc/handlers.ts` — flush → stop capture → flush → stop API

---

## Web (separate repo) — use prompt

Copy **`WEB_TRACKING_FEATURES_PROMPT.txt`** into your web/backend Cursor chat.

Web must:
1. Enforce screenshot visibility by `metadata.visibleToRoles`
2. Aggregate APP_FOCUS by `applicationDisplayName` + sum `activeSeconds` per work day
3. Average `mouseMovePercent` from INPUT_ACTIVITY for the report
4. Scope reports by `workDateKey`, not only latest session

---

## Manual test (desktop)

1. `npm run dev` → login → Start session
2. Use Chrome 5 min → Stop → check logs: `app-focus-sample` (Chrome), `input-activity-sample` (mouseMovePercent > 0), `screenshot-uploaded` (6 and 10 min metadata)
3. Start again → AutoCAD 5 min → Stop → sync; web should show both apps after web fix
4. Confirm logs never show `powershell` in `app-focus-sample`

---

## Commands

```bash
npm run typecheck
npm run test
```
