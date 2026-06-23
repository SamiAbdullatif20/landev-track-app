# LANDEV Tracker — Memory Validation Checklist

Use this after deploying memory optimizations to confirm RAM improved and no features regressed.

---

## 1. Measure memory (Task Manager)

**Windows:** Task Manager → Details → sort by Memory → find `LANDEV Tracker.exe` or `LANDEV Tracker Dev.exe` (dev).

Record **total MB across all processes** with the same app name (main + renderer + GPU may appear separately in some views; sum Details rows for the app).

| State | When to measure | Notes column |
|-------|-----------------|--------------|
| Baseline | Logged in, **not tracking**, 2 min idle | Target: lower than pre-fix idle |
| Active | Tracking **5+ min** (probes + overlay running) | Target: lower overlay + encode spikes |
| Post-stop | **5 min after Stop** (was ~1.2 GB before fix) | Target: overlay destroyed, large drop |
| Screenshot spike | During 6-min capture window while tracking | Brief spike OK; should settle after upload |

**Pass criteria:**
- Post-stop memory drops **meaningfully** vs active tracking (expect 300–500 MB+ reduction after first session).
- Post-stop memory **near baseline**, not stuck at active-session levels.

---

## 2. Automated tests

```powershell
npm run typecheck
npm test
```

Both must pass with zero failures.

**Implementation verification (2026-06-02):** `npm run typecheck` and `npm test` pass (26 test files, 66+ tests). Manual Task Manager before/after numbers still required on a dev machine — use section 7 template below.

---

## 3. Feature regression checklist

### Auth and session
- [ ] Login / logout works
- [ ] Start tracking (project + description)
- [ ] Stop tracking
- [ ] Start → Stop → Start **3 times** — timer and today totals correct
- [ ] Session remote sync (web start/stop mirrors desktop within ~5s) if web configured

### Overlay
- [ ] Overlay pill appears bottom-right when tracking starts
- [ ] Overlay **disappears** when tracking stops (not just hidden taskbar)
- [ ] Overlay reappears on next Start
- [ ] "Today" timer on pill updates (within ~5s of main window)

### Tracking data
- [ ] Today work list shows correct durations
- [ ] Project picker search and selection work
- [ ] Recent tasks panel works
- [ ] Sync status updates (online/offline, pending count)

### Screenshots (requires active session 6+ min)
- [ ] No capture sound
- [ ] Screenshot uploads succeed (check logs or web admin)
- [ ] No OOM or freeze during capture

### Notifications and updates
- [ ] Notification badge still updates
- [ ] About / app info loads
- [ ] Auto-update check does not error on startup (if enabled)

### IPC / UI
- [ ] Main window responsive when paused (background throttling on)
- [ ] Main window timer smooth when tracking (throttling off)
- [ ] No duplicate error toasts or IPC errors in console

---

## 4. Dev vs packaged

| Check | Dev (`npm run dev`) | Packaged (`npm run build:dir`) |
|-------|---------------------|--------------------------------|
| Overlay loads `overlay.html` | Dev server `/overlay.html` | `dist/overlay.html` |
| Console log verbosity | debug OK | warn only |
| DevTools | Available | Disabled |

---

## 5. Known acceptable overhead

These are **not bugs** after optimization:

- **Electron 30 baseline:** main process alone often 250–450 MB
- **Active tracking:** two renderers + 2 PowerShell probes = higher RAM than idle
- **Screenshot moment:** brief memory spike every 6–10 minutes while tracking
- **705 projects:** small renderer cost for full project list

---

## 6. If memory still high after stop

1. Confirm overlay process count drops in Task Manager after Stop
2. Quit app fully and relaunch — verify no orphan `electron.exe`
3. Check logs for screenshot retry loops (413 errors)
4. Deferred items (probe merge, streaming upload) remain in `MEMORY_AUDIT_REPORT.md`

---

## 7. Before/after log template

```
Date:
App version:
Machine RAM:

BEFORE (if available):
  Idle:     ___ MB
  Tracking: ___ MB
  Stopped:  ___ MB

AFTER:
  Idle:     ___ MB
  Tracking: ___ MB
  Stopped:  ___ MB

Regression issues:
Notes:
```
