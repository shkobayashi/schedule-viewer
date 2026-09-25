import { describe, expect, it } from "vitest";
import { validateMembers } from "./validateMembers";

const valid = {
  schemaVersion: 1,
  members: [
    { id: "tanaka", name: "田中" },
    { id: "tanaka-2", name: "田中" },
  ],
};

describe("validateMembers", () => {
  it("allows duplicate display names", () => {
    expect(validateMembers(valid).ok).toBe(true);
  });

  it("rejects a duplicate id", () => {
    const result = validateMembers({
      schemaVersion: 1,
      members: [
        { id: "tanaka", name: "田中" },
        { id: "tanaka", name: "田中二" },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((issue) => issue.message.includes("重複"))).toBe(
      true,
    );
  });

  it("rejects a blank name", () => {
    const result = validateMembers({
      schemaVersion: 1,
      members: [{ id: "tanaka", name: "  " }],
    });
    expect(result.ok).toBe(false);
  });
});
