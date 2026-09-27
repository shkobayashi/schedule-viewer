import { describe, expect, it } from "vitest";
import {
  applyTaskNote,
  hasTaskNote,
  normalizeTaskNote,
} from "./taskNote";

describe("normalizeTaskNote", () => {
  it("trims and drops blank", () => {
    expect(normalizeTaskNote("  hello  ")).toBe("hello");
    expect(normalizeTaskNote("   ")).toBeUndefined();
    expect(normalizeTaskNote(undefined)).toBeUndefined();
  });
});

describe("hasTaskNote", () => {
  it("reflects normalized content", () => {
    expect(hasTaskNote({ note: "x" })).toBe(true);
    expect(hasTaskNote({ note: "  " })).toBe(false);
    expect(hasTaskNote({})).toBe(false);
  });
});

describe("applyTaskNote", () => {
  it("sets or removes note", () => {
    expect(applyTaskNote({}, "  note ")).toEqual({ note: "note" });
    expect(applyTaskNote({ note: "old" }, "  ")).toEqual({});
  });
});
