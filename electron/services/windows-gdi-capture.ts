import { execFile } from "node:child_process";
import { screen } from "electron";
import { promisify } from "node:util";
import { logger } from "../config/logger";

const execFileAsync = promisify(execFile);

const CAPTURE_TIMEOUT_MS = 12_000;

/** Cap intermediate full-frame bitmap width (RAM in the helper process). */
const MAX_PHYSICAL_CAPTURE_WIDTH = 5120;

export type GdiJpegCapture = {
  buffer: Buffer;
  width: number;
  height: number;
  quality: number;
};

export type PrimaryCaptureGeometry = {
  sourceX: number;
  sourceY: number;
  physicalWidth: number;
  physicalHeight: number;
  outputWidth: number;
  outputHeight: number;
  scaleFactor: number;
};

/**
 * Map the primary display's logical bounds to physical pixels for GDI capture.
 * WinForms Screen.Bounds is logical on scaled displays; CopyFromScreen uses physical pixels.
 */
export function computePrimaryCaptureGeometry(
  maxOutputWidth: number,
  display: Pick<Electron.Display, "bounds" | "scaleFactor"> = screen.getPrimaryDisplay()
): PrimaryCaptureGeometry {
  const scaleFactor = display.scaleFactor > 0 ? display.scaleFactor : 1;
  const { bounds } = display;

  let physicalWidth = Math.max(1, Math.round(bounds.width * scaleFactor));
  let physicalHeight = Math.max(1, Math.round(bounds.height * scaleFactor));
  const sourceX = Math.round(bounds.x * scaleFactor);
  const sourceY = Math.round(bounds.y * scaleFactor);

  if (physicalWidth > MAX_PHYSICAL_CAPTURE_WIDTH) {
    physicalHeight = Math.max(1, Math.round(physicalHeight * (MAX_PHYSICAL_CAPTURE_WIDTH / physicalWidth)));
    physicalWidth = MAX_PHYSICAL_CAPTURE_WIDTH;
  }

  const outputWidth = Math.max(1, Math.min(maxOutputWidth, physicalWidth));
  const outputHeight = Math.max(
    1,
    Math.round(physicalHeight * (outputWidth / physicalWidth))
  );

  return {
    sourceX,
    sourceY,
    physicalWidth,
    physicalHeight,
    outputWidth,
    outputHeight,
    scaleFactor
  };
}

function buildCaptureScript(
  maxOutputWidth: number,
  jpegQuality: number,
  geometry: PrimaryCaptureGeometry
): string {
  const quality = Math.min(100, Math.max(30, Math.round(jpegQuality)));
  const maxW = Math.max(160, Math.round(maxOutputWidth));

  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class LandevDpi {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[void][LandevDpi]::SetProcessDPIAware()

$srcX = ${geometry.sourceX}
$srcY = ${geometry.sourceY}
$physW = ${geometry.physicalWidth}
$physH = ${geometry.physicalHeight}
$tw = ${geometry.outputWidth}
$th = ${geometry.outputHeight}
$maxW = ${maxW}
$quality = ${quality}
if ($tw -gt $maxW) {
  $th = [int][Math]::Max(1, [Math]::Round($th * ($maxW / [double]$tw)))
  $tw = $maxW
}

$full = New-Object Drawing.Bitmap $physW, $physH
try {
  $fg = [Drawing.Graphics]::FromImage($full)
  $fg.CopyFromScreen($srcX, $srcY, 0, 0, (New-Object Drawing.Size $physW, $physH), [Drawing.CopyPixelOperation]::SourceCopy)
  $fg.Dispose()
  $scaled = New-Object Drawing.Bitmap $tw, $th
  try {
    $sg = [Drawing.Graphics]::FromImage($scaled)
    $sg.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
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
  maxOutputWidth: number,
  jpegQuality: number
): Promise<GdiJpegCapture | null> {
  if (process.platform !== "win32") {
    return null;
  }

  const geometry = computePrimaryCaptureGeometry(maxOutputWidth);

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        buildCaptureScript(maxOutputWidth, jpegQuality, geometry)
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
    logger.debug("screenshot-gdi-capture-ok", {
      width,
      height,
      bytes: buffer.length,
      scaleFactor: geometry.scaleFactor,
      physicalWidth: geometry.physicalWidth,
      physicalHeight: geometry.physicalHeight
    });

    return {
      buffer,
      width,
      height,
      quality
    };
  } catch (error) {
    logger.warn("screenshot-gdi-capture-failed", {
      error: error instanceof Error ? error.message : "unknown",
      scaleFactor: geometry.scaleFactor,
      physicalWidth: geometry.physicalWidth,
      physicalHeight: geometry.physicalHeight
    });
    return null;
  }
}
