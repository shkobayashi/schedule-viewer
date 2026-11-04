import { describe, expect, it } from "vitest";
import {
  GUIDE_SECTIONS,
  GUIDE_SECTION_TITLES,
  visibleGuideItems,
} from "./guideContent";

describe("guideContent (NAV-08)", () => {
  it("uses the four section titles in order", () => {
    expect([...GUIDE_SECTION_TITLES]).toEqual([
      "最初にやる 3 つ",
      "開く・保存",
      "画面の見方",
      "もう少し知りたいとき",
    ]);
    expect(GUIDE_SECTIONS.map((section) => section.title)).toEqual([
      ...GUIDE_SECTION_TITLES,
    ]);
  });

  it("matches the first-run checklist order in the opening section", () => {
    const first = GUIDE_SECTIONS[0].items.map((item) => item.text);
    expect(first[0]).toContain("開く");
    expect(first[1]).toContain("操作の案内を読む");
    expect(first[2]).toContain("デスクトップ版では");
    expect(first[2]).toContain("MCP");
  });

  it("includes open, save, and diff in 開く・保存", () => {
    const openSave = GUIDE_SECTIONS[1].items.map((item) => item.text).join("\n");
    expect(openSave).toContain("保存");
    expect(openSave).toContain("未保存");
    expect(openSave).toContain("差分を表示");
  });

  it("keeps legacy detail under もう少し知りたいとき", () => {
    const more = GUIDE_SECTIONS[3].items.map((item) => item.text).join("\n");
    expect(more).toContain("系統");
    expect(more).toContain("書き出し");
    expect(more).toContain("イナズマ線");
    expect(more).toContain("JSON作成スキルを置く");
  });

  it("hides desktop-only items on web", () => {
    const allItems = GUIDE_SECTIONS.flatMap((section) => section.items);
    const webItems = GUIDE_SECTIONS.flatMap((section) =>
      visibleGuideItems(section.items, false),
    );
    const webTexts = webItems.map((item) => item.text);
    expect(webTexts.some((text) => text.includes("ファイルを反映しました"))).toBe(
      false,
    );
    expect(webTexts.some((text) => text.includes("自動更新"))).toBe(false);
    expect(webTexts.some((text) => text.includes("説明を表示しています"))).toBe(
      false,
    );
    expect(
      webTexts.some((text) => text.includes("JSON作成スキルを置く")),
    ).toBe(true);
    expect(webTexts.some((text) => text.includes("メンバー一覧"))).toBe(true);
    expect(allItems.filter((item) => item.desktopOnly).length).toBe(3);
  });

  it("shows desktop-only items on desktop", () => {
    const desktopTexts = GUIDE_SECTIONS.flatMap((section) =>
      visibleGuideItems(section.items, true),
    ).map((item) => item.text);
    expect(desktopTexts.some((text) => text.includes("ファイルを反映しました"))).toBe(
      true,
    );
    expect(desktopTexts.some((text) => text.includes("自動更新"))).toBe(true);
    expect(desktopTexts.some((text) => text.includes("説明を表示しています"))).toBe(
      true,
    );
  });

  it("avoids unexplained jargon and defines MCP", () => {
    const joined = GUIDE_SECTIONS.flatMap((section) => section.items)
      .map((item) => item.text)
      .join("\n");
    expect(joined).not.toMatch(/\bWBS\b/);
    expect(joined).not.toMatch(/ガント/);
    expect(joined).not.toMatch(/カタログ/);
    expect(GUIDE_SECTIONS[0].items[2].text).toContain(
      "LLM と画面をつなぐ仕組み",
    );
  });

  it("introduces the menu with 画面左上 only on first hamburger mention", () => {
    const joined = GUIDE_SECTIONS.flatMap((section) => section.items)
      .map((item) => item.text)
      .join("\n");
    expect(joined.match(/画面左上の ☰ メニュー/g)?.length).toBe(1);
    expect(GUIDE_SECTIONS[0].items[0].text).toContain("画面左上の ☰ メニュー");
  });
});
