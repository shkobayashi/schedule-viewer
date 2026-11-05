import { describe, expect, it } from "vitest";
import {
  createMemberCatalogEditHistory,
  pushMemberCatalogEditHistory,
  redoMemberCatalogEditHistory,
  selectedIndexForMemberSnapshot,
  undoMemberCatalogEditHistory,
  type MemberCatalogEditSnapshot,
} from "./memberCatalogEditHistory";
import { removeMemberItem, updateMemberItem } from "./memberEdit";
import type { Member } from "./memberTypes";

const base: Member[] = [
  { id: "a", name: "A", description: "one" },
  { id: "b", name: "B", description: "two" },
];

function snapshot(
  items: Member[],
  selectedId: string | null,
): MemberCatalogEditSnapshot {
  return {
    items: items.map((item) => ({ ...item })),
    selectedId,
  };
}

describe("memberCatalogEditHistory", () => {
  it("undoes one character at a time", () => {
    let history = createMemberCatalogEditHistory();
    let current = snapshot(base, "a");
    const step1 = updateMemberItem(current.items, 0, {
      description: `${current.items[0].description}a`,
    });
    let pushed = pushMemberCatalogEditHistory(
      history,
      current,
      snapshot(step1, "a"),
    );
    expect(pushed?.applied).not.toBeNull();
    history = pushed!.history;
    current = snapshot(step1, "a");

    const step2 = updateMemberItem(step1, 0, {
      description: `${step1[0].description}b`,
    });
    pushed = pushMemberCatalogEditHistory(
      history,
      current,
      snapshot(step2, "a"),
    );
    history = pushed!.history;
    current = snapshot(step2, "a");

    const undone = undoMemberCatalogEditHistory(history, current);
    expect(undone?.snapshot.items[0].description).toBe(step1[0].description);
    const undoneAgain = undoMemberCatalogEditHistory(
      undone!.history,
      undone!.snapshot,
    );
    expect(undoneAgain?.snapshot.items[0].description).toBe(
      base[0].description,
    );
  });

  it("coalesces identical snapshots", () => {
    const history = createMemberCatalogEditHistory();
    const current = snapshot(base, "a");
    const pushed = pushMemberCatalogEditHistory(history, current, current);
    expect(pushed?.applied).toBeNull();
    expect(pushed?.history.presentKey).not.toBeNull();
  });

  it("restores selection when undoing a delete", () => {
    let history = createMemberCatalogEditHistory();
    const current = snapshot(base, "b");
    const removed = removeMemberItem(base, 1);
    const pushed = pushMemberCatalogEditHistory(
      history,
      current,
      snapshot(removed, "a"),
    );
    history = pushed!.history;
    const undone = undoMemberCatalogEditHistory(
      history,
      snapshot(removed, "a"),
    );
    expect(undone?.snapshot.items.some((item) => item.id === "b")).toBe(true);
    expect(undone?.snapshot.selectedId).toBe("b");
    expect(selectedIndexForMemberSnapshot(undone!.snapshot)).toBe(1);
  });

  it("redoes after undo", () => {
    let history = createMemberCatalogEditHistory();
    const current = snapshot(base, "b");
    const edited = updateMemberItem(base, 1, { name: "別名" });
    const pushed = pushMemberCatalogEditHistory(
      history,
      current,
      snapshot(edited, "b"),
    );
    history = pushed!.history;
    const undone = undoMemberCatalogEditHistory(
      history,
      snapshot(edited, "b"),
    );
    const redone = redoMemberCatalogEditHistory(
      undone!.history,
      undone!.snapshot,
    );
    expect(redone?.snapshot.items[1].name).toBe("別名");
  });
});
