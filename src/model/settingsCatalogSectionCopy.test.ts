import { describe, expect, it } from "vitest";
import {
  colorSettingsCatalogCopy,
  memberSettingsCatalogCopy,
  statusSettingsCatalogCopy,
} from "./settingsCatalogSectionCopy";

describe("settingsCatalogSectionCopy", () => {
  it("pins member overwrite confirm after the catalog list", () => {
    expect(memberSettingsCatalogCopy.confirmPlacement).toBe("afterList");
    expect(memberSettingsCatalogCopy.confirm.useAriaModal).toBe(true);
    expect(memberSettingsCatalogCopy.confirm.confirmPrimary).toBe(true);
    expect(memberSettingsCatalogCopy.confirm.body("team")).toContain(
      "上書きして取り込みますか",
    );
  });

  it("pins color and status overwrite confirm before the catalog list", () => {
    expect(colorSettingsCatalogCopy.confirmPlacement).toBe("beforeList");
    expect(statusSettingsCatalogCopy.confirmPlacement).toBe("beforeList");
    expect(colorSettingsCatalogCopy.confirm.ariaLabel).toBe("上書きの確認");
    expect(colorSettingsCatalogCopy.confirm.body("team")).toBe(
      "「team」は既にあります。上書きしますか。",
    );
  });

  it("uses distinct empty-list and failure strings per kind", () => {
    expect(memberSettingsCatalogCopy.emptyListMessage).toContain("カタログ");
    expect(memberSettingsCatalogCopy.selectFailure).toBe(
      "カタログを選択できませんでした。",
    );
    expect(colorSettingsCatalogCopy.emptyListMessage).toContain("一覧");
    expect(colorSettingsCatalogCopy.deleteFailure).toBe(
      "一覧を外せませんでした。",
    );
    expect(statusSettingsCatalogCopy.selectedFallback).toContain("組み込み");
    expect(memberSettingsCatalogCopy.clearSelectionMode).toBe("whenSelected");
    expect(colorSettingsCatalogCopy.clearSelectionMode).toBe("whenAnyCatalog");
  });

  it("pins status confirm copy to match color placement and labels", () => {
    expect(statusSettingsCatalogCopy.confirm.body("x")).toBe(
      colorSettingsCatalogCopy.confirm.body("x"),
    );
    expect(statusSettingsCatalogCopy.confirm.confirmButton).toBe("上書きする");
    expect(statusSettingsCatalogCopy.selectFailure).toBe(
      colorSettingsCatalogCopy.selectFailure,
    );
  });
});
