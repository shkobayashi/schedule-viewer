import { domToPng } from "modern-screenshot";
import type { McpScreenshotForReadTools } from "./screenContext";

export const EXPLANATION_OVERLAY_CAPTURE_ATTR = "data-explanation-overlay";

export function hasExplanationOverlayCaptureAttr(element: {
  hasAttribute(name: string): boolean;
}): boolean {
  return element.hasAttribute(EXPLANATION_OVERLAY_CAPTURE_ATTR);
}

/** MCP 読み取り用 PNG に含める DOM ノードか（説明用の半透明 SVG は除く）。 */
export function shouldCaptureNodeForMcp(node: unknown): boolean {
  if (typeof Element !== "undefined" && node instanceof Element) {
    return !hasExplanationOverlayCaptureAttr(node);
  }
  return true;
}

export async function captureMainElementForMcp(
  element: HTMLElement | null,
): Promise<McpScreenshotForReadTools> {
  if (element == null) return { ok: false };
  try {
    const dataUrl = await domToPng(element, {
      scale: 1,
      filter: (node) => shouldCaptureNodeForMcp(node),
    });
    const prefix = "data:image/png;base64,";
    const base64 = dataUrl.startsWith(prefix)
      ? dataUrl.slice(prefix.length)
      : dataUrl;
    if (base64.length === 0) return { ok: false };
    return { ok: true, base64, mimeType: "image/png" };
  } catch {
    return { ok: false };
  }
}
