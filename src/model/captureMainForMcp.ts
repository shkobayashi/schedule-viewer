import { domToPng } from "modern-screenshot";
import type { McpScreenshotForReadTools } from "./screenContext";

export async function captureMainElementForMcp(
  element: HTMLElement | null,
): Promise<McpScreenshotForReadTools> {
  if (element == null) return { ok: false };
  try {
    const dataUrl = await domToPng(element, { scale: 1 });
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
