import { describe, expect, it } from "vitest";
import {
  buildFieldExtensionExportFiles,
  fieldExtensionExportFileName,
  fieldExtensionExportTooLargeMessage,
  MAX_FIELD_EXTENSION_EXPORT_BYTES,
  normalizeFieldExtensionExportContents,
} from "./workspaceFieldExtensionExport";

describe("fieldExtensionExportFileName", () => {
  it("uses plugin id and .fields.json suffix", () => {
    expect(fieldExtensionExportFileName("sample")).toBe("sample.fields.json");
  });
});

describe("normalizeFieldExtensionExportContents", () => {
  it("appends trailing newline when missing", () => {
    expect(normalizeFieldExtensionExportContents("{}")).toBe("{}\n");
  });

  it("keeps existing trailing newline", () => {
    expect(normalizeFieldExtensionExportContents("{}\n")).toBe("{}\n");
  });
});

describe("buildFieldExtensionExportFiles", () => {
  it("preserves selected order and skips unreadable ids", () => {
    const files = buildFieldExtensionExportFiles(
      ["risk", "missing", "lane"],
      {
        risk: '{"id":"risk"}',
        missing: null,
        lane: '{"id":"lane"}\n',
      },
    );
    expect(files).toEqual([
      {
        fileName: "risk.fields.json",
        contents: '{"id":"risk"}\n',
      },
      {
        fileName: "lane.fields.json",
        contents: '{"id":"lane"}\n',
      },
    ]);
  });

  it("returns empty when nothing readable", () => {
    expect(
      buildFieldExtensionExportFiles(["a"], { a: undefined }),
    ).toEqual([]);
  });
});

describe("fieldExtensionExportTooLargeMessage", () => {
  it("returns message over the limit", () => {
    const big = "x".repeat(MAX_FIELD_EXTENSION_EXPORT_BYTES + 1);
    expect(fieldExtensionExportTooLargeMessage(big)).toBe(
      "拡張項目 JSON が大きすぎます（上限 2 MB）",
    );
  });

  it("returns null within the limit", () => {
    expect(fieldExtensionExportTooLargeMessage("ok")).toBeNull();
  });
});
