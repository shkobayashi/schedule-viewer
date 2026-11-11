import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EXPLANATION_TRIAL_KONVA_DASH,
  EXPLANATION_TRIAL_STROKE_WIDTH,
  uiTokensFor,
} from "./uiTokens";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("explanation trial Konva tokens (#551 increment 4)", () => {
  it("keeps trial dash at 6,4 and stroke width 2 aligned with CSS focus width", () => {
    expect(EXPLANATION_TRIAL_KONVA_DASH).toEqual([6, 4]);
    expect(EXPLANATION_TRIAL_STROKE_WIDTH).toBe(2);
    expect(uiTokensFor("light").borderWidthFocus).toBe("2px");
    expect(uiTokensFor("dark").borderWidthFocus).toBe("2px");
  });

  it("requires connectionArcHaloColor on ExplanationTrialBarsLayer (no f8fafc default)", () => {
    const src = readFileSync(
      path.join(repoRoot, "components", "ExplanationTrialBarsLayer.tsx"),
      "utf8",
    );
    expect(src).not.toContain("#f8fafc");
    expect(src).toContain("connectionArcHaloColor: string");
    expect(src).toContain("EXPLANATION_TRIAL_KONVA_DASH");
    expect(src).toContain("EXPLANATION_TRIAL_STROKE_WIDTH");
  });

  it("passes chart.connectionArcHalo from TimelineChartBodyStage into body layers", () => {
    const stageSrc = readFileSync(
      path.join(repoRoot, "components", "timeline", "TimelineChartBodyStage.tsx"),
      "utf8",
    );
    expect(stageSrc).toContain("connectionArcHaloColor={chart.connectionArcHalo}");
    const layersSrc = readFileSync(
      path.join(repoRoot, "components", "timeline", "TimelineBodyExplanationLayers.tsx"),
      "utf8",
    );
    expect(layersSrc).toContain("connectionArcHaloColor={connectionArcHaloColor}");
  });
});
