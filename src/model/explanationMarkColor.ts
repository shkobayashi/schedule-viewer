const HEX_MARK_COLOR =
  /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function parseExplanationMarkColor(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string") return null;
  if (!HEX_MARK_COLOR.test(value)) return null;
  const body = value.slice(1);
  if (body.length === 3) {
    const expanded = body
      .split("")
      .map((ch) => ch + ch)
      .join("");
    return `#${expanded.toLowerCase()}`;
  }
  return `#${body.toLowerCase()}`;
}

function hexChannelPair(hex: string, index: number): number {
  const start = 1 + index * 2;
  return Number.parseInt(hex.slice(start, start + 2), 16) / 255;
}

function srgbToLinear(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance for sRGB hex `#rrggbb`. */
export function explanationMarkRelativeLuminance(hex: string): number {
  const r = srgbToLinear(hexChannelPair(hex, 0));
  const g = srgbToLinear(hexChannelPair(hex, 1));
  const b = srgbToLinear(hexChannelPair(hex, 2));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function explanationMarkHaloStroke(hex: string): "#ffffff" | "#000000" {
  return explanationMarkRelativeLuminance(hex) < 0.45 ? "#ffffff" : "#000000";
}

export function explanationMarkRingDashStyle(
  kind: "change" | "ask",
): { outlineStyle: "solid" | "dashed"; konvaDash?: number[] } {
  if (kind === "ask") {
    return { outlineStyle: "dashed", konvaDash: [4, 3] };
  }
  return { outlineStyle: "solid" };
}
