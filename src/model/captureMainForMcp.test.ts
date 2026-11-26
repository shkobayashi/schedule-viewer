import { describe, expect, it, vi } from "vitest";
import {
  EXPLANATION_OVERLAY_CAPTURE_ATTR,
  captureMainElementForMcp,
  hasExplanationOverlayCaptureAttr,
  shouldCaptureNodeForMcp,
} from "./captureMainForMcp";

vi.mock("modern-screenshot", () => ({
  domToPng: vi.fn(async () => "data:image/png;base64,abc"),
}));

vi.mock("./explanationKonvaCapture", () => ({
  hideExplanationKonvaLayersForCapture: vi.fn(() => {
    const restore = vi.fn();
    return restore;
  }),
}));

import { hideExplanationKonvaLayersForCapture } from "./explanationKonvaCapture";
import { domToPng } from "modern-screenshot";

describe("shouldCaptureNodeForMcp", () => {
  it("omitExplanationOverlayFromCapture skips overlay nodes", () => {
    const overlay = {
      hasAttribute: (name: string) => name === EXPLANATION_OVERLAY_CAPTURE_ATTR,
    };
    expect(hasExplanationOverlayCaptureAttr(overlay)).toBe(true);
    expect(shouldCaptureNodeForMcp(overlay)).toBe(false);
    expect(
      shouldCaptureNodeForMcp({
        hasAttribute: () => false,
      }),
    ).toBe(true);
    expect(shouldCaptureNodeForMcp(null)).toBe(true);
    expect(shouldCaptureNodeForMcp(undefined)).toBe(true);
  });

  it("captureMainElementForMcp hides Konva layers until finally", async () => {
    const restore = vi.fn();
    vi.mocked(hideExplanationKonvaLayersForCapture).mockReturnValue(restore);
    const element = { tagName: "DIV" } as unknown as HTMLElement;
    const result = await captureMainElementForMcp(element);
    expect(hideExplanationKonvaLayersForCapture).toHaveBeenCalled();
    expect(domToPng).toHaveBeenCalled();
    expect(restore).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});
