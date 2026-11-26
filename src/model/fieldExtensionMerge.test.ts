import { describe, expect, it } from "vitest";
import {
  compositeFieldKey,
  detectExtensionSelectionCollisions,
  mergeExtensionFieldDefs,
  scheduleDefsFromExtension,
} from "./fieldExtensionMerge";
import type { FieldExtensionDocument } from "./fieldExtensionTypes";

const sampleDoc: FieldExtensionDocument = {
  schemaVersion: 1,
  id: "risk",
  name: "リスク",
  fields: [
    { id: "score", name: "点数", type: "number" },
    { id: "lane", name: "区分", type: "choice", choices: ["内製", "外注"] },
  ],
};

describe("fieldExtensionMerge", () => {
  it("builds composite keys from plugin and item ids", () => {
    expect(compositeFieldKey("risk", "score")).toBe("risk_score");
    const defs = scheduleDefsFromExtension(sampleDoc);
    expect(defs[0].key).toBe("risk_score");
    expect(defs[1].key).toBe("risk_lane");
  });

  it("detects collision between selected extensions", () => {
    const other: FieldExtensionDocument = {
      schemaVersion: 1,
      id: "risk_s",
      name: "重複",
      fields: [{ id: "core", name: "別", type: "text" }],
    };
    const ambig: FieldExtensionDocument = {
      schemaVersion: 1,
      id: "a_b",
      name: "曖昧",
      fields: [{ id: "c", name: "曖昧", type: "text" }],
    };
    const ambig2: FieldExtensionDocument = {
      schemaVersion: 1,
      id: "a",
      name: "曖昧2",
      fields: [{ id: "b_c", name: "曖昧2", type: "text" }],
    };
    const collisions = detectExtensionSelectionCollisions([sampleDoc, other]);
    expect(collisions).toHaveLength(0);
    const ambiguous = detectExtensionSelectionCollisions([ambig, ambig2]);
    expect(ambiguous[0]?.key).toBe("a_b_c");
  });

  it("merges multiple extension documents in order", () => {
    const other: FieldExtensionDocument = {
      schemaVersion: 1,
      id: "qa",
      name: "QA",
      fields: [{ id: "note", name: "メモ", type: "text" }],
    };
    const merged = mergeExtensionFieldDefs([sampleDoc, other]);
    expect(merged.map((def) => def.key)).toEqual([
      "risk_score",
      "risk_lane",
      "qa_note",
    ]);
  });
});
