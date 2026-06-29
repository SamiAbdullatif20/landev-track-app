import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = process.argv[2];

if (!src || !fs.existsSync(src)) {
  console.error("Usage: node scripts/generate-app-icon.mjs <source.png>");
  process.exit(1);
}

/** Sizes embedded in .ico — NSIS rejects very large multi-size ICOs. */
const ICO_SIZES = [16, 32, 48, 256];
const PNG_SIZE = 512;

const ICON_BACKGROUND = { r: 237, g: 245, b: 252, alpha: 1 };

const icoPngBuffers = await Promise.all(
  ICO_SIZES.map((size) =>
    sharp(src)
      .resize(size, size, {
        fit: "contain",
        background: ICON_BACKGROUND
      })
      .png()
      .toBuffer()
  )
);

const appPngBuffer = await sharp(src)
  .resize(PNG_SIZE, PNG_SIZE, {
    fit: "contain",
    background: ICON_BACKGROUND
  })
  .png()
  .toBuffer();

const ico = await pngToIco(icoPngBuffers);
const iconsDir = path.join(root, "build", "icons");
const publicDir = path.join(root, "public");
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, "icon.ico"), ico);
fs.writeFileSync(path.join(iconsDir, "icon.png"), appPngBuffer);
fs.writeFileSync(path.join(publicDir, "app-icon.png"), appPngBuffer);

console.log(
  `Generated icon.ico (${ico.length} bytes), icon.png, public/app-icon.png`
);
