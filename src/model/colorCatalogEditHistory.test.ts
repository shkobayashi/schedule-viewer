import { describe, expect, it } from "vitest";
import { starterColorCatalogDocument } from "./colorCatalog";
import { updateColorItem } from "./colorEdit";
import {
  createColorCatalogEditHistory,
  pushColorCatalogEditHistory,
  redoColorCatalogEditHistory,
  selectedIndexForColorSnapshot,
  undoColorCatalogEditHistory,
  type ColorCatalogEditSnapshot,
} from "./colorCatalogEditHistory";
import { HISTORY_MAX } from "./history";

const sample = starterColorCatalogDocument().colors;

function snapshot(
  items: typeof sample,
  selectedId: string | null,
): ColorCatalogEditSnapshot {
  return {
    items: items.map((item) => ({
      ...item,
      color: {
        light: { ...item.color.light },
        dark: { ...item.color.dark },
      },
    })),
    selectedId,
  };
}

describe("colorCatalogEditHistory", () => {
  it("undoes one character at a time", () => {
    let history = createColorCatalogEditHistory();
    let current = snapshot(sample, sample[0].id);
    const step1 = updateColorItem(current.items, 0, {
      description: `${current.items[0].description}a`,
    });
    let pushed = pushColorCatalogEditHistory(
      history,
      current,
      snapshot(step1, sample[0].id),
    );
    history = pushed!.history;
    current = snapshot(step1, sample[0].id);

    const step2 = updateColorItem(step1, 0, {
      description: `${step1[0].description}b`,
    });
    pushed = pushColorCatalogEditHistory(
      history,
      current,
      snapshot(step2, sample[0].id),
    );
    history = pushed!.history;

    const undone = undoColorCatalogEditHistory(
      history,
      snapshot(step2, sample[0].id),
    );
    expect(undone?.snapshot.items[0].description).toBe(step1[0].description);
  });

  it("restores selection when undoing a delete", () => {
    let history = createColorCatalogEditHistory();
    const items = [
      ...sample,
      { ...sample[0], id: "color-2", description: "2" },
    ];
    const current = snapshot(items, "color-2");
    const removed = items.filter((item) => item.id !== "color-2");
    const pushed = pushColorCatalogEditHistory(
      history,
      current,
      snapshot(removed, sample[0].id),
    );
    history = pushed!.history;
    const undone = undoColorCatalogEditHistory(
      history,
      snapshot(removed, sample[0].id),
    );
    expect(undone?.snapshot.items.some((item) => item.id === "color-2")).toBe(
      true,
    );
    expect(undone?.snapshot.selectedId).toBe("color-2");
    expect(selectedIndexForColorSnapshot(undone!.snapshot)).toBe(1);
  });

  it("redoes after undo", () => {
    let history = createColorCatalogEditHistory();
    const current = snapshot(sample, sample[0].id);
    const edited = updateColorItem(sample, 0, { name: "変更後" });
    const pushed = pushColorCatalogEditHistory(
      history,
      current,
      snapshot(edited, sample[0].id),
    );
    history = pushed!.history;
    const undone = undoColorCatalogEditHistory(
      history,
      snapshot(edited, sample[0].id),
    );
    const redone = redoColorCatalogEditHistory(
      undone!.history,
      undone!.snapshot,
    );
    expect(redone?.snapshot.items[0].name).toBe("変更後");
  });

  it("drops the oldest entry past the max", () => {
    let history = createColorCatalogEditHistory();
    let current = snapshot(sample, sample[0].id);
    for (let i = 0; i < HISTORY_MAX + 5; i += 1) {
      const nextItems = updateColorItem(current.items, 0, {
        name: `name-${i}`,
      });
      const pushed = pushColorCatalogEditHistory(
        history,
        current,
        snapshot(nextItems, sample[0].id),
      );
      history = pushed!.history;
      current = snapshot(nextItems, sample[0].id);
    }
    expect(history.past.length).toBe(HISTORY_MAX);
  });
});
