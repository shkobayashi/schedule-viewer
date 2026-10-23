import { describe, expect, it } from "vitest";
import { resolveScheduleTitleCommit } from "./scheduleTitleEdit";

describe("resolveScheduleTitleCommit", () => {
  it("treats blank-only input as blank", () => {
    expect(resolveScheduleTitleCommit("計画", "   ")).toEqual({ kind: "blank" });
  });

  it("treats trim-equal title as unchanged", () => {
    expect(resolveScheduleTitleCommit("計画", "  計画  ")).toEqual({
      kind: "unchanged",
    });
  });

  it("keeps internal spaces and reports changed title", () => {
    expect(resolveScheduleTitleCommit("旧", "  新 題  ")).toEqual({
      kind: "changed",
      title: "新 題",
    });
  });
});
