import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "../config/logger";

const execFileAsync = promisify(execFile);

const CAPTURE_TIMEOUT_MS = 12_000;

/** Max width of the intermediate full-screen bitmap (caps RAM in the helper process). */
const GDI_INTERMEDIATE_MAX_WIDTH = 1600;

export type GdiJpegCapture = {
  buffer: Buffer;
  width: number;
  height: number;
  quality: number;
};

function buildCaptureScript(maxWidth: number, jpegQuality: number): string {
  const quality = Math.min(100, Math.max(30, Math.round(jpegQuality)));
  const capMaxW = GDI_INTERMEDIATE_MAX_WIDTH;
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$screen = [Windows.Forms.Screen]::PrimaryScreen
if ($null -eq $screen) { exit 2 }
$bounds = $screen.Bounds
$maxW = ${Math.max(160, Math.round(maxWidth))}
$quality = ${quality}
$capW = [Math]::Min($bounds.Width, ${capMaxW})
$capH = [int][Math]::Max(1, [Math]::Round($bounds.Height * ($capW / [double]$bounds.Width)))
$tw = [int][Math]::Min($maxW, $capW)
$th = [int][Math]::Max(1, [Math]::Round($capH * ($tw / [double]$capW)))
$full = New-Object Drawing.Bitmap $capW, $capH
try {
  $fg = [Drawing.Graphics]::FromImage($full)
  $fg.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, (New-Object Drawing.Size $capW, $capH), [Drawing.CopyPixelOperation]::SourceCopy)
  $fg.Dispose()
  $scaled = New-Object Drawing.Bitmap $tw, $th
  try {
    $sg = [Drawing.Graphics]::FromImage($scaled)
    $sg.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::Low
    $sg.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighSpeed
    $sg.DrawImage($full, 0, 0, $tw, $th)
    $sg.Dispose()
    $enc = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
    if ($null -eq $enc) { exit 3 }
    $ep = New-Object Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, [long]$quality)
    $ms = New-Object IO.MemoryStream
    try {
      $scaled.Save($ms, $enc, $ep)
      Write-Output ("{0}|{1}|{2}" -f $tw, $th, [Convert]::ToBase64String($ms.ToArray()))
    } finally {
      $ms.Dispose()
      $ep.Dispose()
    }
  } finally {
    $scaled.Dispose()
  }
} finally {
  $full.Dispose()
}
`.trim();
}

/**
 * Capture the primary monitor via Win32 GDI in a short-lived PowerShell process.
 * Avoids Electron desktopCapturer, which can spike Chromium RAM by 1+ GB on multi-monitor setups.
 */
export async function capturePrimaryScreenGdiJpeg(
  maxWidth: number,
  jpegQuality: number
): Promise<GdiJpegCapture | null> {
  if (process.platform !== "win32") {
    return null;
  }

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        buildCaptureScript(maxWidth, jpegQuality)
      ],
      {
        windowsHide: true,
        timeout: CAPTURE_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024
      }
    );

    const encoded = stdout.trim();
    if (!encoded) {
      return null;
    }

    const line =
      encoded
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter((entry) => /^\d+\|\d+\|/.test(entry))
        .pop() ?? encoded;

    const parts = line.split("|");
    if (parts.length < 3) {
      return null;
    }

    const width = Number.parseInt(parts[0] ?? "", 10);
    const height = Number.parseInt(parts[1] ?? "", 10);
    const buffer = Buffer.from(parts.slice(2).join("|"), "base64");
    if (!Number.isFinite(width) || !Number.isFinite(height) || buffer.length === 0) {
      return null;
    }

    const quality = Math.min(100, Math.max(30, Math.round(jpegQuality)));
    return {
      buffer,
      width,
      height,
      quality
    };
  } catch (error) {
    logger.warn("screenshot-gdi-capture-failed", {
      error: error instanceof Error ? error.message : "unknown"
    });
    return null;
  }
}
