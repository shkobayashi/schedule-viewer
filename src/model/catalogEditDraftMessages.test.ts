/**
 * C0: 下書き・保存前検証の利用者向け文言を固定する。
 * 手動: TC-SET-02m（メンバー）、TC-SET-08e（ステータス）、TC-SET-09h（色）。
 */
import { describe, expect, it } from "vitest";
import { BUILTIN_STATUS_ITEMS } from "./statusCatalog";
import { starterColorCatalogDocument } from "./colorCatalog";
import {
  memberDescriptionErrorAt,
  memberDraftError,
} from "./memberEdit";
import {
  statusDescriptionErrorAt,
  statusDraftError,
  updateStatusItem,
} from "./statusEdit";
import { colorDraftError, updateColorItem } from "./colorEdit";

describe("catalog edit draft messages (C0)", () => {
  it("TC-SET-02m: memberDraftError reports blank name", () => {
    expect(
      memberDraftError([{ id: "a", name: "   ", description: "" }]),
    ).toContain("メンバー名は空白にできません");
  });

  it("TC-SET-02m: memberDraftError reports blank id", () => {
    expect(
      memberDraftError([{ id: "  ", name: "A", description: "" }]),
    ).toContain("メンバー IDは空白にできません");
  });

  it("TC-SET-02m: memberDraftError reports duplicate id", () => {
    expect(
      memberDraftError([
        { id: "a", name: "A", description: "" },
        { id: "a", name: "B", description: "" },
      ]),
    ).toContain("メンバー ID が重複しています");
  });

  it("TC-SET-02m: memberDescriptionErrorAt reports blank description", () => {
    expect(
      memberDescriptionErrorAt([{ id: "a", name: "A", description: "   " }], 0),
    ).toBe("説明は空白にできません");
  });

  it("TC-SET-08e: statusDraftError reports blank name and duplicate id", () => {
    expect(
      statusDraftError(updateStatusItem(BUILTIN_STATUS_ITEMS, 0, { name: " " })),
    ).toContain("ステータス名は空白にできません");
    expect(
      statusDraftError(updateStatusItem(BUILTIN_STATUS_ITEMS, 0, { id: "done" })),
    ).toContain("ステータス ID が重複しています");
  });

  it("TC-SET-08e: statusDescriptionErrorAt reports blank description", () => {
    const items = updateStatusItem(BUILTIN_STATUS_ITEMS, 0, {
      description: "   ",
    });
    expect(statusDescriptionErrorAt(items, 0)).toBe("説明は空白にできません");
  });

  it("TC-SET-09h: colorDraftError reports blank name and duplicate id", () => {
    const one = starterColorCatalogDocument().colors[0];
    const colors = [one, { ...one, id: "other", name: "B" }];
    expect(
      colorDraftError(updateColorItem(colors, 0, { name: "  " })),
    ).toContain("名前は空白にできません");
    expect(
      colorDraftError(updateColorItem(colors, 1, { id: one.id })),
    ).toContain("色 ID が重複しています");
  });
});
