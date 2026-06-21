# App icons

Source: LD hexagon brand mark (`scripts/generate-app-icon.mjs`).

Files:
- `icon.ico` — Windows installer + packaged `.exe` icon (electron-builder)
- `icon.png` — generic fallback (512×512)
- `../public/app-icon.png` — runtime window + favicon

Regenerate after replacing the source PNG:

```bash
node scripts/generate-app-icon.mjs path/to/source.png
```
