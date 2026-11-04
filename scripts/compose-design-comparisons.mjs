import sharp from "sharp";
import path from "node:path";

/**
 * @param {string[]} imagePaths
 * @param {string[]} labels
 * @param {string} outputPath
 * @param {number} [targetHeight]
 */
export async function stitchLabeledRow(
  imagePaths,
  labels,
  outputPath,
  targetHeight = 900,
) {
  if (imagePaths.length !== labels.length) {
    throw new Error("imagePaths and labels length mismatch");
  }
  const gap = 10;
  const labelH = 44;
  const slices = [];
  for (const p of imagePaths) {
    const meta = await sharp(p).metadata();
    const w = Math.round(((meta.width ?? 1440) / (meta.height ?? 900)) * targetHeight);
    const buf = await sharp(p).resize(w, targetHeight, { fit: "fill" }).png().toBuffer();
    slices.push({ buf, w });
  }
  let totalW = slices.reduce((sum, s) => sum + s.w + gap, -gap);
  const composites = [];
  let x = 0;
  for (let i = 0; i < slices.length; i++) {
    const { buf, w } = slices[i];
    const label = labels[i]
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const labelSvg = Buffer.from(
      `<svg width="${w}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1e293b"/>
        <text x="50%" y="28" font-family="system-ui,sans-serif" font-size="15" font-weight="600" fill="#f8fafc" text-anchor="middle">${label}</text>
      </svg>`,
    );
    composites.push({ input: labelSvg, top: 0, left: x });
    composites.push({ input: buf, top: labelH, left: x });
    x += w + gap;
  }
  await sharp({
    create: {
      width: totalW,
      height: labelH + targetHeight,
      channels: 3,
      background: { r: 148, g: 163, b: 184 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
}

/**
 * @param {string[]} imagePaths
 * @param {string[]} labels
 * @param {string} outputPath
 * @param {number} [targetHeight]
 */
export async function stitchLabeledRowFromPaths(
  imagePaths,
  labels,
  outputPath,
  targetHeight = 280,
) {
  return stitchLabeledRow(imagePaths, labels, outputPath, targetHeight);
}
