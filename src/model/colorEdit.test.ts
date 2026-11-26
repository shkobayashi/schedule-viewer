import { describe, expect, it } from "vitest";
import { starterColorCatalogDocument } from "./colorCatalog";
import {
  canAddColorItem,
  colorDraftError,
  colorDescriptionErrorAt,
  moveColorItem,
  newColorItem,
  nextColorCatalogId,
  removeColorItem,
  updateColorItem,
  colorsToJson,
} from "./colorEdit";
import { validateColors } from "./validateColors";

const sample = starterColorCatalogDocument().colors;

describe("colorEdit", () => {
  it("adds an item whose id does not collide", () => {
    const items = [...sample, { ...newColorItem(sample), description: "先に足した。" }];
    const next = newColorItem(items);
    expect(items.map((i) => i.id)).not.toContain(next.id);
    expect(colorDraftError([...items, { ...next, description: "" }])).not.toBeNull();
    expect(
      colorDraftError([...items, { ...next, description: "この色にする" }]),
    ).toBeNull();
  });

  it("does not add beyond eight items", () => {
    let items = [...sample];
    while (items.length < 8) {
      items = [...items, { ...newColorItem(items), description: "x" }];
    }
    expect(canAddColorItem(items)).toBe(false);
    expect(items).toHaveLength(8);
  });

  it("never removes the last item", () => {
    const one = [sample[0]];
    expect(removeColorItem(one, 0)).toHaveLength(1);
    const two = [...sample, { ...newColorItem(sample), description: "2" }];
    expect(removeColorItem(two, 1)).toHaveLength(1);
  });

  it("moves an item and ignores moves past either end", () => {
    const second = { ...newColorItem(sample), description: "2" };
    const third = { ...newColorItem([...sample, second]), description: "3" };
    const items = [...sample, second, third];
    expect(moveColorItem(items, 2, -1).map((i) => i.id)).toEqual([
      items[0].id,
      items[2].id,
      items[1].id,
    ]);
    expect(moveColorItem(items, 0, -1).map((i) => i.id)).toEqual(
      items.map((i) => i.id),
    );
  });

  it("picks a free catalog id", () => {
    expect(nextColorCatalogId([])).toBe("custom");
    expect(nextColorCatalogId(["custom", "custom-2"])).toBe("custom-3");
  });

  it("writes JSON that validates", () => {
    const parsed = JSON.parse(colorsToJson(sample));
    expect(validateColors(parsed).ok).toBe(true);
  });

  it("rejects duplicate ids", () => {
    const dup = updateColorItem(
      [...sample, { ...newColorItem(sample), description: "2" }],
      1,
      { id: sample[0].id },
    );
    expect(colorDraftError(dup)).not.toBeNull();
  });

  it("reports blank description on save", () => {
    const blank = updateColorItem(sample, 0, { description: "   " });
    expect(colorDescriptionErrorAt(blank, 0)).not.toBeNull();
    expect(colorDraftError(blank)).not.toBeNull();
  });

  it("updates light fill without dropping dark", () => {
    const next = updateColorItem(sample, 0, {
      color: { light: { bg: "#FFFFFF" } },
    });
    expect(next[0].color.light.bg).toBe("#FFFFFF");
    expect(next[0].color.dark).toEqual(sample[0].color.dark);
  });
});
