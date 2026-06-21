# Refresh Windows taskbar/desktop icons after LANDEV Tracker icon update.
# Run from an elevated or normal PowerShell in the project folder.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Patching LANDEV Tracker executables with the new icon..."
node "$root\scripts\embed-win-icon.cjs" --all
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Refreshing Windows icon cache..."
try {
  ie4uinit.exe -show | Out-Null
} catch {
  Write-Host "ie4uinit unavailable, skipping soft refresh"
}

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1. Quit LANDEV Tracker completely (check system tray)."
Write-Host "  2. If installed under Program Files, re-run this script in an Administrator PowerShell."
Write-Host "  3. Unpin the old taskbar icon if it still shows the Electron logo."
Write-Host "  4. Start LANDEV Tracker again from Start menu or Desktop shortcut."
Write-Host "  5. Right-click the running app on the taskbar -> Pin to taskbar."
