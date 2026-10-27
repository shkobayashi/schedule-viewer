import { describe, expect, it } from "vitest";
import {
  filterPanelHeightLayout,
  filterPanelMaxOuterHeightPx,
} from "./filterPanelLayout";

describe("filterPanelMaxOuterHeightPx", () => {
  it("subtracts margin from viewport below panel top", () => {
    expect(filterPanelMaxOuterHeightPx(100, 800, 8)).toBe(692);
  });

  it("does not go negative", () => {
    expect(filterPanelMaxOuterHeightPx(900, 800, 8)).toBe(0);
  });
});

describe("filterPanelHeightLayout", () => {
  it("keeps natural height when content fits", () => {
    expect(filterPanelHeightLayout(200, 24, 500)).toEqual({
      outerHeight: 224,
      scrolls: false,
    });
  });

  it("caps height and enables scroll when content overflows", () => {
    expect(filterPanelHeightLayout(600, 24, 400)).toEqual({
      outerHeight: 400,
      scrolls: true,
    });
  });
});
