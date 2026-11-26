import { describe, expect, it } from "vitest";
import { validateFieldExtensions } from "./validateFieldExtensions";

describe("validateFieldExtensions", () => {
  it("rejects plugin id containing underscore", () => {
    const result = validateFieldExtensions({
      schemaVersion: 1,
      id: "risk_mgmt",
      name: "リスク",
      fields: [{ id: "score", name: "点数", type: "number" }],
    });
    expect(result.ok).toBe(false);
  });

  it("accepts composite keys from plugin and item ids", () => {
    const result = validateFieldExtensions({
      schemaVersion: 1,
      id: "risk",
      name: "リスク",
      fields: [
        { id: "score", name: "点数", type: "number" },
        { id: "lane", name: "区分", type: "choice", choices: ["内製", "外注"] },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
