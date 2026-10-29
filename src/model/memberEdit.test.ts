import { describe, expect, it } from "vitest";
import {
  emptyMembersDocumentJson,
  memberDraftError,
  membersToJson,
  newMemberItem,
  nextMemberCatalogId,
} from "./memberEdit";
import { validateMembers } from "./validateMembers";

describe("memberEdit", () => {
  it("assigns member-N ids", () => {
    expect(newMemberItem([]).id).toBe("member-1");
    expect(newMemberItem([{ id: "member-1", name: "A" }]).id).toBe("member-2");
  });

  it("assigns custom catalog ids", () => {
    expect(nextMemberCatalogId([])).toBe("custom");
    expect(nextMemberCatalogId(["custom"])).toBe("custom-2");
  });

  it("omits empty description on save json", () => {
    const json = membersToJson([
      { id: "a", name: "A", description: "" },
      { id: "b", name: "B", description: "  backend  " },
    ]);
    const parsed = JSON.parse(json) as {
      members: Array<{ id: string; description?: string }>;
    };
    expect(parsed.members[0]?.description).toBeUndefined();
    expect(parsed.members[1]?.description).toBe("backend");
  });

  it("allows empty members array", () => {
    expect(memberDraftError([])).toBeNull();
    expect(validateMembers(JSON.parse(emptyMembersDocumentJson())).ok).toBe(true);
  });

  it("rejects whitespace-only description in draft", () => {
    expect(
      memberDraftError([{ id: "a", name: "A", description: "   " }]),
    ).not.toBeNull();
  });

  it("allows empty string description in draft", () => {
    expect(
      memberDraftError([{ id: "a", name: "A", description: "" }]),
    ).toBeNull();
    expect(memberDraftError([newMemberItem([])])).toBeNull();
  });
});
