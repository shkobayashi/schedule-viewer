import type { ResolvedColorScheme } from "./palette";

/** 斜線タイルの一辺。地の色が残る間隔にする。 */
export const HATCH_TILE_PX = 8;

/** 斜線の太さ。 */
export const HATCH_LINE_PX = 1.5;

/** 地の色へ混ぜる割合。ライトは黒へ、ダークは白へ。 */
const STRIPE_MIX = 0.42;

function parseHex(color: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(channel: number): string {
  return channel.toString(16).padStart(2, "0");
}

/** ステータス色の地に重ねる斜線。ライトでは濃く、ダークでは明るくする。 */
export function hatchStripeColor(
  bg: string,
  scheme: ResolvedColorScheme,
): string {
  const rgb = parseHex(bg);
  if (!rgb) return scheme === "light" ? "#5c6578" : "#e6e8ee";
  const toward = scheme === "light" ? 0 : 255;
  const mixed = rgb.map((channel) =>
    Math.round(channel + (toward - channel) * STRIPE_MIX),
  );
  return `#${mixed.map(toHex).join("")}`;
}

export function hatchPatternId(bg: string): string {
  const hex = parseHex(bg);
  const slug = hex ? hex.map(toHex).join("") : "fallback";
  return `hatch-${slug}`;
}

function hatchPath(): string {
  const tile = HATCH_TILE_PX;
  const pad = 2;
  return `M0 ${tile} L${tile} 0 M-${pad} ${pad} L${pad} -${pad} M${tile - pad} ${tile + pad} L${tile + pad} ${tile - pad}`;
}

/** SVG の pattern。地の色と斜線を含む。 */
export function hatchPatternMarkup(
  bg: string,
  scheme: ResolvedColorScheme,
): string {
  const stripe = hatchStripeColor(bg, scheme);
  const id = hatchPatternId(bg);
  return `<pattern id="${id}" width="${HATCH_TILE_PX}" height="${HATCH_TILE_PX}" patternUnits="userSpaceOnUse"><rect width="${HATCH_TILE_PX}" height="${HATCH_TILE_PX}" fill="${bg}"/><path d="${hatchPath()}" fill="none" stroke="${stripe}" stroke-width="${HATCH_LINE_PX}"/></pattern>`;
}

const canvasCache = new Map<string, HTMLCanvasElement>();

/** Konva の fillPatternImage。同じ色と配色は使い回す。 */
export function hatchCanvas(
  bg: string,
  scheme: ResolvedColorScheme,
): HTMLCanvasElement {
  const key = `${scheme}:${bg.toLowerCase()}`;
  const cached = canvasCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = HATCH_TILE_PX;
  canvas.height = HATCH_TILE_PX;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, HATCH_TILE_PX, HATCH_TILE_PX);
    ctx.strokeStyle = hatchStripeColor(bg, scheme);
    ctx.lineWidth = HATCH_LINE_PX;
    ctx.beginPath();
    const tile = HATCH_TILE_PX;
    const pad = 2;
    ctx.moveTo(0, tile);
    ctx.lineTo(tile, 0);
    ctx.moveTo(-pad, pad);
    ctx.lineTo(pad, -pad);
    ctx.moveTo(tile - pad, tile + pad);
    ctx.lineTo(tile + pad, tile - pad);
    ctx.stroke();
  }
  canvasCache.set(key, canvas);
  return canvas;
}
