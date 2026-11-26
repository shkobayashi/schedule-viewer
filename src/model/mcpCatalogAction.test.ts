import { describe, expect, it } from "vitest";
import {
  catalogContentsFromEnvelope,
  validateMcpCatalogContents,
} from "./mcpCatalogAction";

describe("mcpCatalogAction", () => {
  it("reads contents string", () => {
    const result = catalogContentsFromEnvelope({ contents: "{}" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe("{}");
  });

  it("pretty-prints contents when the envelope holds an object", () => {
    const result = catalogContentsFromEnvelope({ contents: { schemaVersion: 1, members: [] } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain('"schemaVersion"');
      expect(result.text.endsWith("\n")).toBe(true);
    }
  });

  it("rejects a missing contents field", () => {
    const result = catalogContentsFromEnvelope({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("contents が要ります。");
  });

  it("rejects invalid JSON", () => {
    const validated = validateMcpCatalogContents("members", "{");
    expect(validated.ok).toBe(false);
    if (!validated.ok) expect(validated.message).toBe("JSON の形式が正しくありません。");
  });

  it("rejects members save payload without members array", () => {
    const validated = validateMcpCatalogContents(
      "members",
      JSON.stringify({ schemaVersion: 1 }),
    );
    expect(validated.ok).toBe(false);
  });

  it("accepts minimal members catalog JSON", () => {
    const validated = validateMcpCatalogContents(
      "members",
      JSON.stringify({ schemaVersion: 1, members: [{ id: "a", name: "A" }] }),
    );
    expect(validated.ok).toBe(true);
  });

  it("accepts minimal statuses catalog JSON", () => {
    const validated = validateMcpCatalogContents(
      "statuses",
      JSON.stringify({
        schemaVersion: 2,
        statuses: [
          {
            id: "not-started",
            name: "未着手",
            role: "not-started",
            description: "d",
            instruction: "i",
            color: {
              light: { bg: "#ffffff", border: "#cccccc" },
              dark: { bg: "#000000", border: "#333333" },
            },
          },
        ],
      }),
    );
    expect(validated.ok).toBe(true);
  });

  it("accepts minimal colors catalog JSON", () => {
    const validated = validateMcpCatalogContents(
      "colors",
      JSON.stringify({
        schemaVersion: 1,
        colors: [
          {
            id: "c1",
            name: "C",
            description: "d",
            color: {
              light: { bg: "#eeeeee" },
              dark: { bg: "#111111" },
            },
          },
        ],
      }),
    );
    expect(validated.ok).toBe(true);
  });

  it("accepts minimal fields catalog JSON", () => {
    const validated = validateMcpCatalogContents(
      "fields",
      JSON.stringify({
        schemaVersion: 1,
        id: "sample",
        name: "サンプル",
        fields: [{ id: "memo", name: "メモ", type: "text" }],
      }),
    );
    expect(validated.ok).toBe(true);
  });

  it("rejects members JSON that fails validator semantics", () => {
    const validated = validateMcpCatalogContents(
      "members",
      JSON.stringify({ schemaVersion: 1, members: [{ id: "", name: "X" }] }),
    );
    expect(validated.ok).toBe(false);
    if (!validated.ok) {
      expect(validated.message).toBe("members / 0 / ID: 1 文字以上必要です");
    }
  });

  it("rejects statuses JSON that fails validator semantics", () => {
    const validated = validateMcpCatalogContents(
      "statuses",
      JSON.stringify({ schemaVersion: 2, statuses: [] }),
    );
    expect(validated.ok).toBe(false);
    if (!validated.ok) {
      expect(validated.message).toBe("statuses: 1 件以上必要です");
    }
  });

  it("rejects colors with duplicate ids", () => {
    const validated = validateMcpCatalogContents(
      "colors",
      JSON.stringify({
        schemaVersion: 1,
        colors: [
          {
            id: "c1",
            name: "C",
            description: "d",
            color: {
              light: { bg: "#eeeeee" },
              dark: { bg: "#111111" },
            },
          },
          {
            id: "c1",
            name: "D",
            description: "d",
            color: {
              light: { bg: "#eeeeee" },
              dark: { bg: "#111111" },
            },
          },
        ],
      }),
    );
    expect(validated.ok).toBe(false);
  });
});
