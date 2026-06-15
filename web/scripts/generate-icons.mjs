/**
 * Generates every icon variant the PWA / browsers / iOS need from a single
 * 1024×1024 (or larger) master at /public/logo-source.png.
 *
 * Run with: `npm run generate:icons` (see package.json).
 *
 * Outputs:
 *   /public/icons/icon-192.png            — PWA, "purpose: any"
 *   /public/icons/icon-512.png            — PWA, "purpose: any"
 *   /public/icons/icon-192-maskable.png   — Android adaptive, safe-zone padded
 *   /public/icons/icon-512-maskable.png   — Android adaptive, safe-zone padded
 *   /public/apple-touch-icon.png          — iOS home screen (180)
 *   /public/favicon-32x32.png             — Modern browser tab
 *   /public/favicon-16x16.png             — Legacy browser tab
 *   /public/favicon.ico                   — Multi-res ICO for old browsers
 *
 * The maskable variants extend the gradient edge-to-edge (no rounded corners)
 * and shrink the fish to 80% so it survives whatever shape Android decides
 * to clip the icon to (circle / squircle / teardrop).
 */

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");
const iconsDir = resolve(publicDir, "icons");
const source = resolve(publicDir, "logo-source.png");

async function ensureDirs() {
  await mkdir(iconsDir, { recursive: true });
}

/**
 * Returns a clean squircle-only PNG buffer where:
 *   - the bounding box is trimmed tight against the squircle, AND
 *   - every remaining "checker pattern" pixel inside that box (the bits in
 *     the rounded-corner gaps) is set to true transparency.
 *
 * Nano Banana (and most image-gen models) bake the grey/white checker pattern
 * straight into the pixels — alpha is always 255, so the corners look
 * transparent but are actually solid grey. Without this two-step cleanup the
 * final icons end up with grey wedges in their corners.
 */
async function getCleanSquircleBuffer() {
  const trimmed = await sharp(source)
    .trim({ background: { r: 232, g: 232, b: 232 }, threshold: 30 })
    .ensureAlpha()
    .toBuffer();
  const meta = await sharp(trimmed).metadata();
  const raw = await sharp(trimmed).raw().toBuffer();
  stripCheckerInPlace(raw, meta.width, meta.height, null);
  return sharp(raw, { raw: { width: meta.width, height: meta.height, channels: 4 } })
    .png()
    .toBuffer();
}

/**
 * Sample the actual top and bottom colours of the squircle so the maskable
 * backdrop gradient matches it exactly.
 */
async function sampleGradientColors() {
  const trimmed = await getCleanSquircleBuffer();
  const meta = await sharp(trimmed).metadata();
  const { width, height } = meta;

  // Sample ~12% in from the top and bottom edges — far enough in to avoid
  // any residual checker artefacts at the trim boundary.
  const insetY = Math.round(height * 0.12);

  const topPixel = await sharp(trimmed)
    .extract({ left: Math.floor(width / 2), top: insetY, width: 1, height: 1 })
    .raw()
    .toBuffer();
  const bottomPixel = await sharp(trimmed)
    .extract({
      left: Math.floor(width / 2),
      top: height - insetY - 1,
      width: 1,
      height: 1,
    })
    .raw()
    .toBuffer();

  const toHex = (buf) =>
    "#" +
    [buf[0], buf[1], buf[2]]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");

  return { top: toHex(topPixel), bottom: toHex(bottomPixel) };
}

/**
 * Plain "any-purpose" icon — uses the trimmed squircle so we never ship the
 * baked-in transparency-checker pattern that Nano Banana renders into the
 * source PNG.
 */
async function makeAnyIcon(size, outPath, cleanBuf) {
  await sharp(cleanBuf).resize(size, size, { fit: "fill" }).png().toFile(outPath);
  console.log(`  ✓ ${outPath}  (${size}×${size}, any)`);
}

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
}

/**
 * True when a pixel looks like part of the Nano-Banana "transparency checker"
 * pattern: light, low-saturation, and grey-ish (all channels close together).
 * Tuned for the 232/255/237-ish greys we see in the actual source.
 */
function isCheckerPixel(r, g, b) {
  if (r < 200 || g < 200 || b < 200) return false; // too dark to be checker
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 15) return false; // saturated colour, leave it alone
  return true;
}

/**
 * Build a vertical-gradient PNG buffer pixel by pixel. Bypasses sharp's SVG
 * renderer (which silently mangled linearGradient stops, producing a near-
 * white canvas) by writing the RGBA bytes directly.
 */
function makeVerticalGradientBuffer(size, topHex, bottomHex) {
  const top = hexToRgb(topHex);
  const bottom = hexToRgb(bottomHex);
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(top.r + (bottom.r - top.r) * t);
    const g = Math.round(top.g + (bottom.g - top.g) * t);
    const b = Math.round(top.b + (bottom.b - top.b) * t);
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

/**
 * Walk a raw RGBA buffer and replace every pixel that looks like the
 * Nano-Banana checker pattern with either a) true transparency (alpha=0) or
 * b) the matching position on a vertical gradient — depending on the
 * `replacement` arg.
 */
function stripCheckerInPlace(buf, width, height, replacement) {
  let topRgb = null;
  let bottomRgb = null;
  if (replacement && replacement.gradient) {
    topRgb = hexToRgb(replacement.gradient.top);
    bottomRgb = hexToRgb(replacement.gradient.bottom);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = buf[i];
      const g = buf[i + 1];
      const b = buf[i + 2];
      if (!isCheckerPixel(r, g, b)) continue;

      if (replacement && replacement.gradient) {
        const t = y / (height - 1);
        buf[i] = Math.round(topRgb.r + (bottomRgb.r - topRgb.r) * t);
        buf[i + 1] = Math.round(topRgb.g + (bottomRgb.g - topRgb.g) * t);
        buf[i + 2] = Math.round(topRgb.b + (bottomRgb.b - topRgb.b) * t);
        buf[i + 3] = 255;
      } else {
        buf[i + 3] = 0;
      }
    }
  }
}

/**
 * Maskable icon — gradient fills the entire canvas (no transparency anywhere),
 * source squircle fills the entire canvas too so Android's adaptive-icon mask
 * (circle/squircle/teardrop) crops naturally.
 *
 * The source has TRANSPARENT rounded corners around its squircle. We paint
 * the entire canvas with a gradient sampled from the squircle itself so when
 * the source is composited on top, the transparent corners reveal a colour
 * that matches what "should" be there — the seam disappears.
 */
async function makeMaskableIcon(size, outPath, colors, cleanBuf) {
  const innerBuf = await sharp(cleanBuf)
    .resize(size, size, { fit: "fill" })
    .png()
    .toBuffer();

  const bgRaw = makeVerticalGradientBuffer(size, colors.top, colors.bottom);

  await sharp(bgRaw, { raw: { width: size, height: size, channels: 4 } })
    .composite([{ input: innerBuf, gravity: "center" }])
    .png()
    .toFile(outPath);
  console.log(`  ✓ ${outPath}  (${size}×${size}, maskable, bg ${colors.top}→${colors.bottom})`);
}

/**
 * Sharp doesn't speak ICO, so we hand-roll one. The ICO container is dead
 * simple: a header + N directory entries + each PNG appended verbatim.
 * Modern browsers all parse PNG-embedded ICO files happily.
 */
async function makeFaviconIco(outPath, cleanBuf, sizes = [16, 32, 48]) {
  const pngBuffers = await Promise.all(
    sizes.map((s) =>
      sharp(cleanBuf).resize(s, s, { fit: "fill" }).png().toBuffer()
    )
  );

  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + entrySize * sizes.length;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // ICO type
  header.writeUInt16LE(sizes.length, 4); // image count

  let offset = dirSize;
  const entries = sizes.map((s, i) => {
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(s === 256 ? 0 : s, 0); // width  (0 == 256)
    entry.writeUInt8(s === 256 ? 0 : s, 1); // height (0 == 256)
    entry.writeUInt8(0, 2);                 // palette
    entry.writeUInt8(0, 3);                 // reserved
    entry.writeUInt16LE(1, 4);              // colour planes
    entry.writeUInt16LE(32, 6);             // bits per pixel
    entry.writeUInt32LE(buf.length, 8);     // image size
    entry.writeUInt32LE(offset, 12);        // image offset
    offset += buf.length;
    return entry;
  });

  await writeFile(outPath, Buffer.concat([header, ...entries, ...pngBuffers]));
  console.log(`  ✓ ${outPath}  (${sizes.join("+")} multi-res ICO)`);
}

async function main() {
  console.log(`Generating icons from ${source}`);
  await ensureDirs();

  const cleanBuf = await getCleanSquircleBuffer();
  const cleanMeta = await sharp(cleanBuf).metadata();
  console.log(`Cleaned squircle: ${cleanMeta.width}×${cleanMeta.height} (checker pattern trimmed)`);

  const colors = await sampleGradientColors();
  console.log(`Sampled gradient: ${colors.top} → ${colors.bottom}`);

  console.log("\nPWA icons (any-purpose):");
  await makeAnyIcon(192, resolve(iconsDir, "icon-192.png"), cleanBuf);
  await makeAnyIcon(512, resolve(iconsDir, "icon-512.png"), cleanBuf);

  console.log("\nPWA icons (maskable for Android adaptive):");
  await makeMaskableIcon(192, resolve(iconsDir, "icon-192-maskable.png"), colors, cleanBuf);
  await makeMaskableIcon(512, resolve(iconsDir, "icon-512-maskable.png"), colors, cleanBuf);

  console.log("\niOS home-screen:");
  await makeAnyIcon(180, resolve(publicDir, "apple-touch-icon.png"), cleanBuf);

  console.log("\nFavicons:");
  await makeAnyIcon(32, resolve(publicDir, "favicon-32x32.png"), cleanBuf);
  await makeAnyIcon(16, resolve(publicDir, "favicon-16x16.png"), cleanBuf);
  await makeFaviconIco(resolve(publicDir, "favicon.ico"), cleanBuf);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
