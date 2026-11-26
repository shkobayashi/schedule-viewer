import { describe, expect, it } from "vitest";
import {
  overlayReactionToMemberCatalogChange,
  shouldReloadEditingMemberCatalogItems,
} from "./memberCatalogEditSession";
import type { Member } from "./memberTypes";

const sample: Member[] = [{ id: "a", name: "A" }];

describe("overlayReactionToMemberCatalogChange", () => {
  it("ignores when no catalog is open", () => {
    expect(
      overlayReactionToMemberCatalogChange(null, {
        kind: "removed",
        catalogId: "custom",
      }),
    ).toBe("ignore");
  });

  it("closes when the open catalog is removed", () => {
    expect(
      overlayReactionToMemberCatalogChange("custom", {
        kind: "removed",
        catalogId: "custom",
      }),
    ).toBe("close");
  });

  it("reloads when another window overwrites the open catalog", () => {
    expect(
      overlayReactionToMemberCatalogChange("custom", {
        kind: "imported",
        catalogId: "custom",
        fromSelf: false,
      }),
    ).toBe("reload");
  });

  it("ignores self save reload", () => {
    expect(
      overlayReactionToMemberCatalogChange("custom", {
        kind: "imported",
        catalogId: "custom",
        fromSelf: true,
      }),
    ).toBe("ignore");
  });

  it("ignores unrelated catalogs", () => {
    expect(
      overlayReactionToMemberCatalogChange("custom", {
        kind: "imported",
        catalogId: "other",
        fromSelf: false,
      }),
    ).toBe("ignore");
  });
});

describe("shouldReloadEditingMemberCatalogItems", () => {
  it("skips reload when saved and loaded items match", () => {
    expect(shouldReloadEditingMemberCatalogItems(sample, sample)).toBe(false);
  });

  it("reloads when an item name changed", () => {
    const loaded = [{ ...sample[0], name: "別名" }];
    expect(shouldReloadEditingMemberCatalogItems(sample, loaded)).toBe(true);
  });
});
