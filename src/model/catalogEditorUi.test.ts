import { describe, expect, it } from "vitest";
import {
  CATALOG_WORKSPACE_EDIT_ID,
  baselineRowPersisted,
  canEditCatalogItems,
  catalogEditorKeyAction,
  catalogEditorRowKey,
  catalogExportSuggestedName,
  deleteControlDisabled,
  memberRowPersisted,
  revealScrollDelta,
  shrinkSelectionIndex,
} from "./catalogEditorUi";

describe("catalogEditorUi", () => {
  it("allows workspace edit only for __workspace__ id", () => {
    expect(canEditCatalogItems("workspace", CATALOG_WORKSPACE_EDIT_ID)).toBe(true);
    expect(canEditCatalogItems("workspace", "team")).toBe(false);
    expect(canEditCatalogItems("app", "team")).toBe(true);
  });

  it("routes overlay keys through confirm, undo, close, and tab", () => {
    expect(
      catalogEditorKeyAction({
        modalOpen: true,
        composing: false,
        key: "Escape",
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
      }),
    ).toBe("cancel-confirm");
    expect(
      catalogEditorKeyAction({
        modalOpen: false,
        composing: false,
        key: "Tab",
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
      }),
    ).toBe("trap-tab");
    expect(
      catalogEditorKeyAction({
        modalOpen: false,
        composing: true,
        key: "z",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        altKey: false,
      }),
    ).toBe("ignore");
    expect(
      catalogEditorKeyAction({
        modalOpen: false,
        composing: false,
        key: "z",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        altKey: false,
      }),
    ).toBe("undo");
    expect(
      catalogEditorKeyAction({
        modalOpen: false,
        composing: false,
        key: "Escape",
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
      }),
    ).toBe("close");
  });

  it("computes scroll reveal delta", () => {
    expect(revealScrollDelta(100, 200, 80, 120)).toBe(-20);
    expect(revealScrollDelta(100, 200, 110, 210)).toBe(10);
    expect(revealScrollDelta(100, 200, 110, 190)).toBe(0);
  });

  it("tracks member session-new rows", () => {
    const baseline = new Set(["a"]);
    const session = new Set<string>();
    expect(memberRowPersisted(baseline, session, "a")).toBe(true);
    expect(catalogEditorRowKey(false, "b", 1)).toBe("new-1");
    expect(baselineRowPersisted(baseline, "a")).toBe(true);
  });

  it("disables delete for keep-last policy", () => {
    expect(deleteControlDisabled("keep-last", 1)).toBe(true);
    expect(deleteControlDisabled("any", 1)).toBe(false);
  });

  it("suggests export names", () => {
    expect(catalogExportSuggestedName(null, "members")).toBe("members");
    expect(catalogExportSuggestedName("team", "members")).toBe("team");
  });

  it("shrinks selection index when list shortens", () => {
    expect(shrinkSelectionIndex(0, 2, true)).toBe(0);
    expect(shrinkSelectionIndex(1, 1, false)).toBe(0);
  });
});
