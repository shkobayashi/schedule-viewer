import { describe, expect, it } from "vitest";
import {
  buildFullReleaseBody,
  buildReleaseNotesMarkdownSection,
  extractVersionSectionBody,
  linkifyIssueReferencesInLine,
  normalizeVersionLabel,
  parseReleaseNotesForVersion,
  validateVersionSectionBullets,
} from "./releaseNotes";

const SAMPLE = `# Changelog

## [Unreleased]

### 追加

- 未公開

## [2.0.0] - 2026-01-01

### 追加

- 機能A (#100)
- 機能B (#101) (#102)

### 修正

- 不具合 (#103)

## [1.0.0] - 2025-01-01

### 追加

- 初版
`;

describe("normalizeVersionLabel", () => {
  it("strips leading v", () => {
    expect(normalizeVersionLabel("v1.2.3")).toBe("1.2.3");
  });
});

describe("extractVersionSectionBody", () => {
  it("returns the matching version block without the heading", () => {
    const body = extractVersionSectionBody(SAMPLE, "2.0.0");
    expect(body).toContain("### 追加");
    expect(body).toContain("機能A (#100)");
    expect(body).not.toContain("## [1.0.0]");
  });

  it("returns null when version is missing", () => {
    expect(extractVersionSectionBody(SAMPLE, "9.9.9")).toBeNull();
  });
});

describe("validateVersionSectionBullets", () => {
  it("accepts bullets with issue numbers", () => {
    const body = extractVersionSectionBody(SAMPLE, "2.0.0")!;
    expect(validateVersionSectionBullets(body)).toEqual({ ok: true });
  });

  it("rejects bullets without issue numbers", () => {
    const body = extractVersionSectionBody(SAMPLE, "1.0.0")!;
    expect(validateVersionSectionBullets(body).ok).toBe(false);
  });
});

describe("linkifyIssueReferencesInLine", () => {
  it("turns parenthesized refs into markdown links", () => {
    expect(
      linkifyIssueReferencesInLine("- 説明 (#155)", "shkobayashi/schedule-viewer"),
    ).toBe(
      "- 説明 [#155](https://github.com/shkobayashi/schedule-viewer/issues/155)",
    );
  });
});

describe("buildReleaseNotesMarkdownSection", () => {
  it("linkifies list items only", () => {
    const body = extractVersionSectionBody(SAMPLE, "2.0.0")!;
    const out = buildReleaseNotesMarkdownSection(body, "o/r");
    expect(out).toContain("[#100](https://github.com/o/r/issues/100)");
    expect(out).toContain("### 追加");
  });
});

describe("buildFullReleaseBody", () => {
  it("combines prefix and linked section", () => {
    const body = buildFullReleaseBody(
      "## ダウンロード\n\n手順",
      SAMPLE,
      "2.0.0",
      "o/r",
    );
    expect(body.startsWith("## ダウンロード")).toBe(true);
    expect(body).toContain("## 変更");
    expect(body).toContain("[#103](https://github.com/o/r/issues/103)");
  });

  it("throws when version section is missing", () => {
    expect(() =>
      buildFullReleaseBody("prefix", SAMPLE, "9.9.9", "o/r"),
    ).toThrow(/節がありません/);
  });
});

describe("parseReleaseNotesForVersion", () => {
  it("groups items by category and strips issue refs from text", () => {
    const parsed = parseReleaseNotesForVersion(SAMPLE, "v2.0.0");
    expect(parsed?.version).toBe("2.0.0");
    expect(parsed?.categories).toHaveLength(2);
    expect(parsed?.categories[0].items[0]).toEqual({
      text: "機能A",
      issueNumbers: [100],
    });
  });

  it("returns null when the version section is missing", () => {
    expect(parseReleaseNotesForVersion(SAMPLE, "9.9.9")).toBeNull();
  });
});
