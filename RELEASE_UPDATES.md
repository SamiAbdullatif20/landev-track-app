# LANDEV Tracker — auto-updates (setup + costs)

Employees **do not need GitHub accounts**. The installed app checks for updates and shows **“Software update needed”** → **Update now** → **Restart and update**.

---

## What is already in the app

- `electron-updater` checks for new versions on launch and every 4 hours
- In-app dialog when a newer version exists
- `AUTO_UPDATE_ENABLED=true` in `.env.prod` (packaged builds)

---

## One-time setup (you / admin)

### 1. Put the repo on GitHub

If it is not already there, create a private or public repo (e.g. `YOUR_ORG/landev-track-app`).

### 2. Edit `electron-builder.json5`

Replace placeholders:

```json5
"owner": "YOUR_GITHUB_ORG",
"repo": "landev-track-app"
```

### 3. Create a GitHub personal access token

- GitHub → Settings → Developer settings → Personal access tokens
- Scopes: **`repo`** (for private repo) or **`public_repo`** (public repo only)
- Save the token securely

### 4. Publish a release (each new version)

```powershell
# Bump version in package.json first (e.g. 1.0.0 → 1.0.1)

$env:GH_TOKEN="your_github_token_here"
npm run release:win
```

This will:

1. Build the Windows installer
2. Create a GitHub Release for that version
3. Upload `LANDEV Tracker-Windows-x.x.x-Setup.exe` + `latest.yml`

Installed apps will detect the new version automatically.

### 5. First install for each employee (one time only)

Send them the **first** installer manually (or an internal download link). After that, updates are in-app.

---

## Your release checklist

1. Merge your changes
2. Bump `"version"` in `package.json` (must increase every release)
3. Run `npm run release:win` with `GH_TOKEN` set
4. Confirm the release on GitHub → Releases
5. Open an installed app → should show update prompt within minutes (or on restart)

---

## Costs

| Item | Typical cost | Required? |
|------|----------------|-----------|
| **GitHub repo** | **Free** (public or private) | Yes |
| **GitHub Releases hosting** | **Free** for reasonable installer sizes | Yes |
| **Employee GitHub accounts** | **Free** — not needed | No |
| **Windows code signing certificate** | ~**USD $200–400 / year** | Recommended |
| **Cloud hosting (only if not using GitHub)** | ~$0–5/month (R2/S3) | Optional |

### Code signing (recommended)

Without signing, Windows SmartScreen may warn on install/update. For a small internal team you can start **unsigned** for testing, then buy an **OV code signing** cert and set:

```powershell
$env:CSC_LINK="path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD="your-cert-password"
npm run release:win
```

Remove `signAndEditExecutable=false` from the release script when signing is configured.

---

## Alternative: generic HTTPS host (not GitHub)

If you prefer Cloudflare R2 / S3 instead of GitHub Releases:

1. In `electron-builder.json5`, change `publish` to:

```json5
"publish": [
  {
    "provider": "generic",
    "url": "https://your-cdn.example.com/landev-track/releases/"
  }
]
```

2. After each build, upload from `release/<version>/`:
   - `latest.yml`
   - `LANDEV Tracker-Windows-<version>-Setup.exe`

3. URL must be **HTTPS**.

**Extra cost:** often **$0–5/month** for storage + bandwidth on R2/S3.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot parse releases feed` / `Unable to find latest version` | Fixed in app: updater fetches `latest.yml` from `UPDATE_FEED_URL` in `.env.prod` (GitHub `releases/latest/download`). Ship a new release after updating |
| `Cannot create symbolic link` / `winCodeSign` on Windows | Already disabled via `signAndEditExecutable: false` in `electron-builder.json5`. Or enable **Windows Developer Mode** (Settings → System → For developers) if you enable signing later |
| No update prompt | Confirm `AUTO_UPDATE_ENABLED=true` in built app; version in `package.json` must be **higher** than installed |
| `GH_TOKEN` error | Token needs `repo` scope; set env var in same shell as `npm run release:win` |
| Update check fails offline | App retries on next launch |
| SmartScreen blocks install | Code-sign the installer |

---

## Dev builds

Auto-update runs only in **packaged** installs (`npm run build` / installer), not `npm run dev`.
