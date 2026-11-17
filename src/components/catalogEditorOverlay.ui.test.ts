import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  colorCatalogEditorCopy,
  memberCatalogEditorCopy,
  statusCatalogEditorCopy,
} from "../model/catalogEditorCopy";

const componentsDir = path.dirname(fileURLToPath(import.meta.url));

function readComponent(name: string): string {
  return readFileSync(path.join(componentsDir, name), "utf8");
}

describe("catalog editor overlay UI (C3)", () => {
  const shared = readComponent("CatalogEditorOverlay.tsx");

  it("keeps shared overlay shell classes and dialog roles", () => {
    expect(shared).toContain('className="status-catalog-overlay"');
    expect(shared).toContain('role="dialog"');
    expect(shared).toContain('aria-modal="true"');
    expect(shared).toContain('className="status-catalog-discard-dialog"');
    expect(shared).toContain('role="alertdialog"');
    expect(shared).toContain('className="status-catalog-confirm-backdrop"');
    expect(shared).toContain("catalogEditorKeyAction");
  });

  it("pins member-specific copy via catalogEditorCopy", () => {
    expect(shared).toContain("{copy.overlayTitle}");
    expect(memberCatalogEditorCopy.overlayTitle).toBe("メンバーの項目を編集");
    expect(memberCatalogEditorCopy.radioGroupName).toBe("memberCatalogEdit");
    expect(memberCatalogEditorCopy.newListButton).toBe("新しいカタログ");
  });

  it("pins status-specific copy", () => {
    expect(statusCatalogEditorCopy.overlayTitle).toBe(
      "ステータス一覧の項目を編集",
    );
    expect(statusCatalogEditorCopy.radioGroupName).toBe("statusCatalogEdit");
    expect(statusCatalogEditorCopy.pickerLegend).toBe("編集する一覧");
  });

  it("pins color-specific copy", () => {
    expect(colorCatalogEditorCopy.removeConfirmInUseExtra).toContain(
      "行の地は塗らなくなります",
    );
    expect(colorCatalogEditorCopy.radioGroupName).toBe("colorCatalogEdit");
  });

  it("keeps thin member overlay wrapper wiring", () => {
    const member = readComponent("MemberCatalogEditorOverlay.tsx");
    expect(member).toContain("memberCatalogEditorCopy");
    expect(member).toContain("CatalogEditorOverlay");
    expect(member).toContain("MemberCatalogEditorPanel");
    expect(member).toContain("key={slot.key}");
  });
});

describe("catalog editor panel footer UI (C3)", () => {
  it("exposes shared footer button labels", () => {
    const footer = readComponent("CatalogEditorPanelFooter.tsx");
    expect(footer).toContain("status-catalog-editor-footer");
    expect(footer).toContain("CATALOG_EDITOR_SHARED_COPY.save");
    expect(footer).toContain("CATALOG_EDITOR_SHARED_COPY.revertEdits");
    expect(footer).toContain("CATALOG_EDITOR_SHARED_COPY.exportJson");
  });

  it("keeps member panel list hint in member panel source", () => {
    const panel = readComponent("MemberCatalogEditorPanel.tsx");
    expect(panel).toContain("CatalogEditorPanelFooter");
    expect(panel).toContain("memberCatalogEditorCopy.addItemButton");
    expect(panel).toContain("<code>assigneeId</code>");
  });
});
