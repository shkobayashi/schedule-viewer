import { describe, expect, it } from "vitest";
import {
  excelConnectorBentAdj1,
  excelConnectorDescriptor,
  excelConnectorStraight,
  excelConnectorStrokeRgb,
} from "./excelConnector";

describe("excelConnector", () => {
  it("uses straight connector on the same row", () => {
    expect(excelConnectorStraight(true)).toBe(true);
    expect(excelConnectorStraight(false)).toBe(false);
  });

  it("picks stroke color from broken flag only", () => {
    expect(excelConnectorStrokeRgb(false, "light")).toBe("8A94A6");
    expect(excelConnectorStrokeRgb(true, "light")).toBe("C4351A");
    expect(excelConnectorStrokeRgb(false, "dark")).toBe("8a94a6");
    expect(excelConnectorStrokeRgb(true, "dark")).toBe("f07050");
  });

  it("places bent elbow 12px from the predecessor when the gap is wide enough", () => {
    expect(excelConnectorBentAdj1(100, 200)).toBe(12_000);
  });

  it("places bent elbow at the midpoint when the gap is narrower than 12px", () => {
    expect(excelConnectorBentAdj1(100, 105)).toBe(50_000);
  });

  it("descriptor uses straight geometry on the same row", () => {
    const d = excelConnectorDescriptor(false, true, 100, 200, "light");
    expect(d.straight).toBe(true);
    expect(d.bentAdj1).toBe(50_000);
    expect(d.strokeRgb).toBe("8A94A6");
    expect(d.broken).toBe(false);
  });

  it("descriptor uses bent geometry across rows", () => {
    const d = excelConnectorDescriptor(true, false, 100, 200, "light");
    expect(d.straight).toBe(false);
    expect(d.bentAdj1).toBe(12_000);
    expect(d.strokeRgb).toBe("C4351A");
    expect(d.broken).toBe(true);
  });
});
