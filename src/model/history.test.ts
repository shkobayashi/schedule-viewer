import { describe, expect, it } from "vitest";
import {
  createDocumentHistory,
  pushDocumentHistory,
  redoDocumentHistory,
  undoDocumentHistory,
  type DocumentSnapshot,
} from "./history";

function snapshot(name: string, note?: string): DocumentSnapshot {
  const task = {
    id: "00000000-0000-4000-8000-000000000001",
    name,
    start: "2026-01-01",
    end: "2026-01-02",
    assigneeId: null,
    status: "not-started" as const,
    progress: 0,
    confidence: "committed" as const,
    predecessors: [] as string[],
    milestoneId: null,
  };
  return {
    categories: [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "C",
        groups: [
          {
            id: "d1000001-0000-4000-8000-000000000001",
            name: "G",
            tasks: [note === undefined ? task : { ...task, note }],
          },
        ],
      },
    ],
    milestoneGroups: [],
    milestones: [],
  };
}

function taskName(document: DocumentSnapshot): string {
  return document.categories[0]!.groups[0]!.tasks[0]!.name;
}

describe("document history", () => {
  it("does not push identical content", () => {
    const current = snapshot("Alpha");
    const same = snapshot("Alpha");
    const first = pushDocumentHistory(
      createDocumentHistory(),
      current,
      same,
    );
    expect(first?.applied).toBeNull();
    expect(first?.history.past).toEqual([]);
    expect(first?.history.presentKey).toEqual(expect.any(String));

    const second = pushDocumentHistory(first!.history, current, snapshot("Alpha"));
    expect(second).toBeNull();

    const changed = pushDocumentHistory(
      first!.history,
      current,
      snapshot("Beta"),
    );
    expect(changed?.applied).not.toBeNull();
    expect(taskName(changed!.applied!)).toBe("Beta");
    expect(changed?.history.past).toHaveLength(1);
    expect(taskName(changed!.history.past[0]!.snapshot)).toBe("Alpha");
  });

  it("treats a whitespace-only note as the same content", () => {
    const pushed = pushDocumentHistory(
      createDocumentHistory(),
      snapshot("Alpha", "  "),
      snapshot("Alpha"),
    );
    expect(pushed?.applied).toBeNull();
    expect(pushed?.history.past).toEqual([]);
    expect(pushed?.history.presentKey).toEqual(expect.any(String));
  });

  it("drops the oldest entry after 100 steps", () => {
    let history = createDocumentHistory();
    let current = snapshot("0");
    for (let step = 1; step <= 101; step += 1) {
      const pushed = pushDocumentHistory(history, current, snapshot(String(step)));
      expect(pushed?.applied).not.toBeNull();
      history = pushed!.history;
      current = pushed!.applied!;
    }
    expect(history.past).toHaveLength(100);
    expect(taskName(history.past[0]!.snapshot)).toBe("1");
    expect(taskName(current)).toBe("101");

    const undone = undoDocumentHistory(history, current);
    expect(taskName(undone!.snapshot)).toBe("100");
  });

  it("undo and redo restore the document", () => {
    const pushed = pushDocumentHistory(
      createDocumentHistory(),
      snapshot("Alpha"),
      snapshot("Beta"),
    );
    const undone = undoDocumentHistory(pushed!.history, pushed!.applied!);
    expect(taskName(undone!.snapshot)).toBe("Alpha");
    expect(undone?.history.past).toEqual([]);
    expect(undone?.history.future).toHaveLength(1);

    const redone = redoDocumentHistory(undone!.history, undone!.snapshot);
    expect(taskName(redone!.snapshot)).toBe("Beta");
    expect(redone?.history.past).toHaveLength(1);
    expect(redone?.history.future).toEqual([]);

    const unchanged = pushDocumentHistory(
      redone!.history,
      redone!.snapshot,
      snapshot("Beta"),
    );
    expect(unchanged).toBeNull();
  });

  it("clears the redo stack after a new edit", () => {
    const pushed = pushDocumentHistory(
      createDocumentHistory(),
      snapshot("Alpha"),
      snapshot("Beta"),
    );
    const undone = undoDocumentHistory(pushed!.history, pushed!.applied!);
    const edited = pushDocumentHistory(
      undone!.history,
      undone!.snapshot,
      snapshot("Gamma"),
    );
    expect(edited?.history.future).toEqual([]);
    expect(taskName(edited!.applied!)).toBe("Gamma");
    expect(
      redoDocumentHistory(edited!.history, edited!.applied!),
    ).toBeNull();
  });
});
