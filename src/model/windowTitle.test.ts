import { describe, expect, it } from "vitest";
import { formatWindowTitle } from "./windowTitle";

describe("formatWindowTitle", () => {
  it("includes display name and app suffix", () => {
    expect(formatWindowTitle("sample.json", false)).toBe(
      "sample.json - schedule-viewer",
    );
  });

  it("prefixes asterisk when dirty", () => {
    expect(formatWindowTitle("plan.json", true)).toBe(
      "* plan.json - schedule-viewer",
    );
  });

  it("uses sample label when name is empty", () => {
    expect(formatWindowTitle("  ", false)).toBe("サンプルデータ - schedule-viewer");
  });
});
