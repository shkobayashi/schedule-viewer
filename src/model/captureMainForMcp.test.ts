import { describe, expect, it } from "vitest";
import {
  EXPLANATION_OVERLAY_CAPTURE_ATTR,
  hasExplanationOverlayCaptureAttr,
  shouldCaptureNodeForMcp,
} from "./captureMainForMcp";

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
});
