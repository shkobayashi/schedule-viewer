import { describe, expect, it } from "vitest";
import { starterColorCatalogDocument } from "./colorCatalog";
import {
  overlayReactionToColorCatalogChange,
  shouldReloadEditingColorCatalogItems,
} from "./colorCatalogEditSession";

const sample = starterColorCatalogDocument().colors;

describe("overlayReactionToColorCatalogChange", () => {
  it("ignores when no catalog is open", () => {
    expect(
      overlayReactionToColorCatalogChange(null, {
        kind: "removed",
        catalogId: "custom",
      }),
    ).toBe("ignore");
  });

  it("closes when the open catalog is removed", () => {
    expect(
      overlayReactionToColorCatalogChange("custom", {
        kind: "removed",
        catalogId: "custom",
      }),
    ).toBe("close");
  });

  it("reloads when another window overwrites the open catalog", () => {
    expect(
      overlayReactionToColorCatalogChange("custom", {
        kind: "imported",
        catalogId: "custom",
        fromSelf: false,
      }),
    ).toBe("reload");
  });

  it("ignores self save reload", () => {
    expect(
      overlayReactionToColorCatalogChange("custom", {
        kind: "imported",
        catalogId: "custom",
        fromSelf: true,
      }),
    ).toBe("ignore");
  });
});

describe("shouldReloadEditingColorCatalogItems", () => {
  it("skips reload when saved and loaded items match", () => {
    expect(
      shouldReloadEditingColorCatalogItems(sample, sample),
    ).toBe(false);
  });

  it("reloads when an item name changed", () => {
    const loaded = sample.map((item, index) =>
      index === 0 ? { ...item, name: "別名" } : item,
    );
    expect(shouldReloadEditingColorCatalogItems(sample, loaded)).toBe(true);
  });
});
