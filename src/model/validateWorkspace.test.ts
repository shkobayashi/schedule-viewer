import { describe, expect, it } from "vitest";
import { validateWorkspace } from "./validateWorkspace";

describe("validateWorkspace editableFieldExtension", () => {
  it("accepts workspace with only schedule and editable extension path", () => {
    const result = validateWorkspace({
      schemaVersion: 1,
      schedule: "plan.json",
      editableFieldExtension: "custom.fields.json",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects absolute editable path", () => {
    const result = validateWorkspace({
      schemaVersion: 1,
      schedule: "plan.json",
      editableFieldExtension: "/abs/custom.fields.json",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects empty editable path", () => {
    const result = validateWorkspace({
      schemaVersion: 1,
      schedule: "plan.json",
      editableFieldExtension: "   ",
    });
    expect(result.ok).toBe(false);
  });
});
