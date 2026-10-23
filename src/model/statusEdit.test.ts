import { describe, expect, it } from "vitest";
import { BUILTIN_STATUS_ITEMS } from "./statusCatalog";
import {
  moveStatusItem,
  newStatusItem,
  nextStatusCatalogId,
  removeStatusItem,
  statusDraftError,
  statusesToJson,
  updateStatusItem,
} from "./statusEdit";
import { validateStatuses } from "./validateStatuses";

describe("statusEdit", () => {
  it("adds an item whose id does not collide", () => {
    const items = [
      ...BUILTIN_STATUS_ITEMS,
      { ...newStatusItem(BUILTIN_STATUS_ITEMS), description: "先に足した。" },
    ];
    const next = newStatusItem(items);
    expect(items.map((i) => i.id)).not.toContain(next.id);
    expect(statusDraftError([...items, next])).not.toBeNull();
    expect(
      statusDraftError([...items, { ...next, description: "確認を待っている。" }]),
    ).toBeNull();
  });

  it("updates one item and keeps the other color scheme", () => {
    const next = updateStatusItem(BUILTIN_STATUS_ITEMS, 1, {
      name: "作業中",
      color: { light: { bg: "#FFFFFF" } },
    });
    expect(next[1].name).toBe("作業中");
    expect(next[1].color.light.bg).toBe("#FFFFFF");
    expect(next[1].color.light.border).toBe(BUILTIN_STATUS_ITEMS[1].color.light.border);
    expect(next[1].color.dark).toEqual(BUILTIN_STATUS_ITEMS[1].color.dark);
    expect(next[0]).toBe(BUILTIN_STATUS_ITEMS[0]);
  });

  it("moves an item and ignores moves past either end", () => {
    expect(moveStatusItem(BUILTIN_STATUS_ITEMS, 2, -1).map((i) => i.id)).toEqual([
      "not-started",
      "done",
      "in-progress",
    ]);
    expect(moveStatusItem(BUILTIN_STATUS_ITEMS, 0, -1).map((i) => i.id)).toEqual(
      BUILTIN_STATUS_ITEMS.map((i) => i.id),
    );
  });

  it("never removes the last item", () => {
    const one = [BUILTIN_STATUS_ITEMS[0]];
    expect(removeStatusItem(one, 0)).toHaveLength(1);
    expect(removeStatusItem(BUILTIN_STATUS_ITEMS, 1)).toHaveLength(2);
  });

  it("picks a free catalog id", () => {
    expect(nextStatusCatalogId([])).toBe("custom");
    expect(nextStatusCatalogId(["custom", "custom-2"])).toBe("custom-3");
  });

  it("writes JSON that validates", () => {
    const parsed = JSON.parse(statusesToJson(BUILTIN_STATUS_ITEMS));
    expect(validateStatuses(parsed).ok).toBe(true);
  });

  it("reports a blank name and a duplicate id", () => {
    expect(statusDraftError(updateStatusItem(BUILTIN_STATUS_ITEMS, 0, { name: " " }))).not.toBeNull();
    expect(statusDraftError(updateStatusItem(BUILTIN_STATUS_ITEMS, 0, { id: "done" }))).not.toBeNull();
  });
});
