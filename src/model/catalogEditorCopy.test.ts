import { describe, expect, it } from "vitest";
import {
  catalogAppliedNote,
  catalogRemoveConfirmLines,
  catalogSavedMessage,
  catalogSaveErrorMessage,
  catalogSubtitle,
  colorCatalogEditorCopy,
  memberCatalogEditorCopy,
  statusCatalogEditorCopy,
} from "./catalogEditorCopy";

describe("catalogEditorCopy", () => {
  it("builds member applied notes for app modes", () => {
    expect(
      catalogAppliedNote(memberCatalogEditorCopy, {
        mode: "app",
        appliedCatalogId: "team",
        editingCatalogId: "team",
        workspaceAppliedNote: "",
      }),
    ).toBe(memberCatalogEditorCopy.appliedThis);
    expect(
      catalogAppliedNote(memberCatalogEditorCopy, {
        mode: "app",
        appliedCatalogId: null,
        editingCatalogId: "team",
        workspaceAppliedNote: "",
      }),
    ).toBe(memberCatalogEditorCopy.appliedNone);
  });

  it("adds dirty and in-use lines to remove confirm", () => {
    const lines = catalogRemoveConfirmLines(statusCatalogEditorCopy, {
      dirty: true,
      appliedCatalogId: "team",
      editingCatalogId: "team",
    });
    expect(lines[0]).toBe(statusCatalogEditorCopy.removeConfirmLead);
    expect(lines).toContain("下書きは保存しません。");
    expect(lines).toContain(statusCatalogEditorCopy.removeConfirmInUseExtra);
  });

  it("uses status workspace subtitle with file label", () => {
    expect(
      catalogSubtitle(statusCatalogEditorCopy, {
        mode: "workspace",
        workspaceFileLabel: "proj/statuses.json",
      }),
    ).toBe(
      "設定ファイルのステータス（proj/statuses.json）の項目を編集します。",
    );
  });

  it("formats save messages", () => {
    expect(catalogSavedMessage("team")).toBe("「team」を保存しました。");
    expect(catalogSaveErrorMessage(new Error("bad"))).toBe("bad");
    expect(catalogSaveErrorMessage(null)).toBe("保存に失敗しました。");
  });

  it("pins color radio group name", () => {
    expect(colorCatalogEditorCopy.radioGroupName).toBe("colorCatalogEdit");
  });
});
