import { describe, expect, it } from "vitest";
import { parseSidebarColumns } from "./viewPreferences";

describe("parseSidebarColumns", () => {
  it("treats a missing status key as off", () => {
    expect(
      parseSidebarColumns(
        JSON.stringify({ start: true, end: false, duration: false, progress: false }),
      ).status,
    ).toBe(false);
  });

  it("reads status when explicitly true", () => {
    expect(
      parseSidebarColumns(
        JSON.stringify({
          start: false,
          end: false,
          duration: false,
          progress: false,
          status: true,
        }),
      ).status,
    ).toBe(true);
  });
});
