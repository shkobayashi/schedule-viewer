import { describe, expect, it } from "vitest";
import {
  collisionAfterExtensionSave,
  extensionDocumentFromDrafts,
  newEmptyExtensionDocument,
} from "./fieldExtensionEdit";
import type { FieldExtensionDocument } from "./fieldExtensionTypes";
import { fieldDraftsFromFields } from "./fieldDefinitionEdit";
import { scheduleDefsFromExtension } from "./fieldExtensionMerge";
import { validateFieldExtensions } from "./validateFieldExtensions";

describe("newEmptyExtensionDocument", () => {
  it("passes field extension validation", () => {
    const document = newEmptyExtensionDocument("custom");
    const result = validateFieldExtensions(document);
    expect(result.ok).toBe(true);
    expect(document.fields[0]?.name).toBe("項目");
  });
});

describe("extensionDocumentFromDrafts", () => {
  it("rejects invalid plugin id", () => {
    const document = newEmptyExtensionDocument("custom");
    const drafts = fieldDraftsFromFields(scheduleDefsFromExtension(document));
    const built = extensionDocumentFromDrafts("bad id", "名前", drafts);
    expect(built.ok).toBe(false);
    if (!built.ok) {
      expect(built.message).toContain("プラグイン ID");
    }
  });

  it("uses draft keys as item ids in composite keys", () => {
    const document = newEmptyExtensionDocument("plugin");
    const drafts = fieldDraftsFromFields(scheduleDefsFromExtension(document));
    const withKey = drafts.map((draft) => ({ ...draft, key: "memo" }));
    const built = extensionDocumentFromDrafts("plugin", "名前", withKey);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.document.fields[0]?.id).toBe("memo");
    }
  });
});

describe("collisionAfterExtensionSave", () => {
  it("reports composite key overlap with other selected extensions", () => {
    const ambig: FieldExtensionDocument = {
      schemaVersion: 1,
      id: "a_b",
      name: "A",
      fields: [{ id: "c", name: "C", type: "text" }],
    };
    const ambig2: FieldExtensionDocument = {
      schemaVersion: 1,
      id: "a",
      name: "B",
      fields: [{ id: "b_c", name: "BC", type: "text" }],
    };
    const message = collisionAfterExtensionSave(ambig, [ambig2]);
    expect(message).toContain("a_b_c");
  });
});
