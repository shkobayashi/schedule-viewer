import { describe, expect, it } from "vitest";
import {
  isBaselineConflictLabel,
  type BaselineDiffClassification,
} from "./baselineDiffsClassification";

describe("baselineDiffsClassification", () => {
  it("treats conflicting labels as conflicts", () => {
    const conflict: BaselineDiffClassification[] = [
      "異なる",
      "削除と変更",
      "追加と削除",
    ];
    for (const label of conflict) {
      expect(isBaselineConflictLabel(label)).toBe(true);
    }
    expect(isBaselineConflictLabel("同じ")).toBe(false);
  });
});
