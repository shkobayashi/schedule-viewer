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

  it("rejects members save payload without members array", () => {
    const validated = validateMcpCatalogContents(
      "members",
      JSON.stringify({ schemaVersion: 1 }),
    );
    expect(validated.ok).toBe(false);
  });
});
