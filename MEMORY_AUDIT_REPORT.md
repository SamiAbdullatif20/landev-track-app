# LANDEV Tracker — Memory Audit Report

**Date:** 2026-06-18  
**Observed symptom:** ~1.7 GB RAM in Task Manager during active tracking  
**Scope:** Electron main process, renderers, screenshot pipeline, sync, React UI

---

## Executive summary

The high RAM footprint is **mostly structural** (Electron 30 + Chromium + two renderer processes + Windows probes during tracking), not an unbounded memory leak. The largest fixable issues are:

1. Overlay `BrowserWindow` kept alive (hidden) after session stop
2. Overlay loading the full React SPA bundle
3. Transient screenshot encode/upload buffer duplication

Bounded in-memory caches (rollup samples, diagnostics, queue on SQLite) are correctly capped.

---

## A. Electron architecture

| Finding | Severity | Impact | Status |
|---------|----------|--------|--------|
| Main window single instance in `electron/main.ts` | OK | Baseline ~150–350 MB renderer | No change |
| Overlay second `BrowserWindow` in `tracking-overlay.ts` | **Critical** | +150–400 MB after first session | **Fix: destroy on stop** |
| Overlay only destroyed on main window `closed` | High | Overlay survives stop | **Fix: destroy on stop** |
| Preload script shared, no leak pattern | OK | — | No change |
| IPC uses `ipcMain.handle` (request/response) | OK | — | No change |

---

## B. Renderer memory analysis

| Finding | Severity | Impact | Status |
|---------|----------|--------|--------|
| `main.tsx` imports both `App` and `TrackingOverlayView` | **High** | Overlay loads full app graph | **Fix: separate entry** |
| Zustand stores (`trackingStore.ts`) small, static | Low | ~1–10 MB | No change |
| Project list in renderer (705 projects) | Medium | ~5–10 MB | Deferred |
| `input-activity-rollup.ts` MAX_SAMPLES=2000 | Low | <1 MB | No change |
| `activity-interval-tracker.ts` current window only | Low | <100 KB | No change |

---

## C. Event listener leaks

| Location | Cleanup | Severity | Status |
|----------|---------|----------|--------|
| Sync/project/session-remote pollers | `stop()` clears intervals | OK | No change |
| Input/app-focus/screenshot timers | `stop()` clears | OK | No change |
| Preload `ipcRenderer.on` | Returns unsubscribe | OK | No change |
| `App.tsx` IPC subscriptions | `useEffect` cleanup | OK | No change |
| `registerIpc` on macOS re-activate | Could double-register | Low | **Fix: guard flag** |
| `auto-update` / `powerMonitor` listeners | Never removed | Low | No change (single boot) |

---

## D. DOM and UI analysis

| Finding | Severity | Impact | Status |
|---------|----------|--------|--------|
| Main UI compact, no large lists | OK | — | No change |
| Project picker searchable, not virtualized | Low | Acceptable at ~705 items | Deferred |
| Overlay renders single pill | OK | — | No change |

---

## E. Image and media analysis

| Finding | Severity | Impact | Status |
|---------|----------|--------|--------|
| `desktopCapturer` thumbnails per capture | **High** | +30–120 MB spikes | Partial fix: fewer JPEG passes, buffer release |
| `buildScreenshotMultipartBody` copies JPEG | **High** | +520 KB per upload | Documented; stream upload deferred |
| `NativeImage.destroy()` via `releaseNativeImage` | OK | — | Already implemented |
| Display media handler 1920×1080 | Medium | Latent spike | **Fix: 1280×720** |
| No screenshot cache in RAM | OK | — | No change |

---

## F. Data loading

| Finding | Severity | Impact | Status |
|---------|----------|--------|--------|
| SQLite queue (disk-backed) | OK | — | No change |
| `getAllProjectsPaginated` up to 20k projects transient | Medium | +5–40 MB during sync | Deferred |
| Work log JSON in settings, MAX 400 entries | Low | — | No change |

---

## G. React framework audit

| Finding | Severity | Impact | Status |
|---------|----------|--------|--------|
| `React.StrictMode` in dev only effect doubling | Low | Dev only | No change |
| Overlay `getWorkSummary` every 1s | Medium | IPC churn | **Fix: 5s poll** |
| Effect cleanup in overlay/App | OK | — | No change |

---

## H. Memory leak detection

| Pattern | Result |
|---------|--------|
| Unbounded global arrays | None found (rollup/diagnostics capped) |
| Singleton growth | Env/timezone caches bounded with TTL |
| Retained closures in pollers | Cleared on `stop()` |
| Long-lived PowerShell probes | **50–150 MB during sessions** — merge deferred (high risk) |

---

## I. Production build audit

| Item | Result | Status |
|------|--------|--------|
| DevTools disabled when packaged | OK | No change |
| Source maps default off in Vite prod | OK | **Explicit `sourcemap: false`** |
| Console log level `debug` always | Medium | **Fix: warn in prod** |
| `--no-sandbox` dev only | OK | No change |

---

## Severity-ranked findings

### Critical
1. Overlay window hidden but not destroyed on session stop — **150–400 MB** when paused

### High
2. Overlay loads full SPA bundle — **50–150 MB**
3. Screenshot multipart body duplicates image buffer — **20–80 MB** spikes (partial mitigation)
4. Up to 6 JPEG encode attempts per capture — **10–40 MB** transient — **Fix: 3 passes**

### Medium
5. Display media handler large thumbnails
6. `backgroundThrottling: false` always on main window
7. Overlay polls work summary every 1s
8. Console debug logging in production

### Low
9. `registerIpc` double-registration on macOS activate

### Deferred (not implemented)
10. Merge PowerShell input + foreground probes (~50–150 MB, high regression risk)
11. Streaming multipart upload (no buffer copy)
12. Project list pagination in renderer

---

## Implemented fixes (this release)

See git diff for:
- `tracking-overlay.ts` — destroy overlay when session inactive
- `overlay.html` + `src/overlay-main.tsx` — minimal overlay bundle
- `vite.config.ts` — multi-page build
- `screenshot-compress.ts` — reduced JPEG encode passes
- `screenshot-worker.ts` — buffer reference release after upload
- `main.ts` — background throttling toggle, smaller display-media thumbnails
- `logger.ts` — production console level
- `TrackingOverlayView.tsx` — 5s work summary poll
- `handlers.ts` — IPC registration guard, overlay URL, throttling hook

---

## Expected memory impact

| Scenario | Before (approx.) | After (target) |
|----------|------------------|----------------|
| App open, not tracking | 400–700 MB | **≤ 500 MB** |
| Tracking active | 1.2–2.5 GB | **≤ 900 MB** |
| Paused after 1+ sessions | ~1.2 GB (overlay hidden) | **≤ 550 MB** |

Validate with `MEMORY_VALIDATION_CHECKLIST.md`.
