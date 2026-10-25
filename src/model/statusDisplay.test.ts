import { describe, expect, it } from "vitest";
import {
  resolveStatusSidebarDisplay,
  statusColumnChars,
  statusSidebarColumnLabel,
} from "./statusDisplay";
import { BUILTIN_STATUS_ITEMS } from "./statusCatalog";

describe("statusColumnChars", () => {
  it("uses at least three characters and caps at eight", () => {
    expect(statusColumnChars([])).toBe(3);
    expect(statusColumnChars(["未着手"])).toBe(3);
    expect(statusColumnChars(["verylongidname"])).toBe(8);
  });
});

describe("resolveStatusSidebarDisplay", () => {
  const statuses = BUILTIN_STATUS_ITEMS;

  it("shows the display name for a known id", () => {
    const display = resolveStatusSidebarDisplay(statuses, "in-progress");
    expect(display).toEqual({ kind: "known", label: "進行中" });
    expect(statusSidebarColumnLabel(display)).toBe("進行中");
  });

  it("shows the raw id for an unknown id", () => {
    const display = resolveStatusSidebarDisplay(statuses, "custom-x");
    expect(display).toEqual({ kind: "unknown", id: "custom-x" });
    expect(statusSidebarColumnLabel(display)).toBe("custom-x");
  });
});
