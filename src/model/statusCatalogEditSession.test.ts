import { describe, expect, it } from "vitest";
import { BUILTIN_STATUS_ITEMS } from "./statusCatalog";
import {
  overlayReactionToCatalogChange,
  shouldReloadEditingCatalogItems,
} from "./statusCatalogEditSession";

describe("overlayReactionToCatalogChange", () => {
  it("ignores when no catalog is open", () => {
    expect(
      overlayReactionToCatalogChange(null, {
        kind: "removed",
        catalogId: "custom",
      }),
    ).toBe("ignore");
  });

  it("closes when the open catalog is removed", () => {
    expect(
      overlayReactionToCatalogChange("custom", {
        kind: "removed",
        catalogId: "custom",
      }),
    ).toBe("close");
  });

  it("reloads when another window overwrites the open catalog", () => {
    expect(
      overlayReactionToCatalogChange("custom", {
        kind: "imported",
        catalogId: "custom",
        fromSelf: false,
      }),
    ).toBe("reload");
  });

  it("ignores self save reload", () => {
    expect(
      overlayReactionToCatalogChange("custom", {
        kind: "imported",
        catalogId: "custom",
        fromSelf: true,
      }),
    ).toBe("ignore");
  });

  it("ignores unrelated catalogs", () => {
    expect(
      overlayReactionToCatalogChange("custom", {
        kind: "imported",
        catalogId: "other",
        fromSelf: false,
      }),
    ).toBe("ignore");
  });
});

describe("shouldReloadEditingCatalogItems", () => {
  it("skips reload when saved and loaded items match", () => {
    expect(
      shouldReloadEditingCatalogItems(
        BUILTIN_STATUS_ITEMS,
        BUILTIN_STATUS_ITEMS,
      ),
    ).toBe(false);
  });

  it("reloads when an item name changed", () => {
    const loaded = BUILTIN_STATUS_ITEMS.map((item, index) =>
      index === 0 ? { ...item, name: "別名" } : item,
    );
    expect(shouldReloadEditingCatalogItems(BUILTIN_STATUS_ITEMS, loaded)).toBe(
      true,
    );
  });
});
