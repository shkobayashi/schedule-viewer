import { describe, expect, it } from "vitest";
import type { ScheduleFieldDef, Task } from "./types";
import {
  fieldValueChangeLinesForDiff,
  fieldValueSnapshotLinesForDiff,
  fieldValuesEqualForDiff,
  orderedFieldValueKeysForDiff,
} from "./fieldValuesDiff";

const fields: ScheduleFieldDef[] = [
  { key: "z_key", name: "Z", type: "number" },
  { key: "a_key", name: "A", type: "text" },
];

function task(partial: Partial<Task> & Pick<Task, "id" | "name">): Task {
  return {
    start: "2026-01-01",
    end: "2026-01-01",
    assigneeIds: [],
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
    ...partial,
  };
}

describe("fieldValuesDiff", () => {
  it("orders changed keys by definition order, not lexicographic", () => {
    const fileTask = task({
      id: "t1",
      name: "A",
      fieldValues: { z_key: 1, a_key: "x" },
    });
    const screenTask = task({
      id: "t1",
      name: "A",
      fieldValues: { z_key: 2, a_key: "y" },
    });
    const lines = fieldValueChangeLinesForDiff(fileTask, screenTask, fields);
    expect(lines).toEqual(['  z_key: 1 → 2', '  a_key: "x" → "y"']);
    expect(
      orderedFieldValueKeysForDiff(fields, fileTask.fieldValues, screenTask.fieldValues),
    ).toEqual(["z_key", "a_key"]);
  });

  it("omits unchanged keys from change lines", () => {
    const fileTask = task({
      id: "t1",
      name: "A",
      fieldValues: { z_key: 1, a_key: "same" },
    });
    const screenTask = task({
      id: "t1",
      name: "A",
      fieldValues: { z_key: 2, a_key: "same" },
    });
    const lines = fieldValueChangeLinesForDiff(fileTask, screenTask, fields);
    expect(lines).toEqual(["  z_key: 1 → 2"]);
  });

  it("places unknown keys after defined keys in lexicographic order", () => {
    const keys = orderedFieldValueKeysForDiff(
      fields,
      { orphan_b: 1, a_key: "x", orphan_a: 2 },
      { orphan_b: 3, a_key: "y", orphan_a: 4 },
    );
    expect(keys).toEqual(["a_key", "orphan_a", "orphan_b"]);
  });

  it("uses missing label and JSON values", () => {
    const fileTask = task({ id: "t1", name: "A" });
    const screenTask = task({
      id: "t1",
      name: "A",
      fieldValues: { a_key: "new" },
    });
    const lines = fieldValueChangeLinesForDiff(fileTask, screenTask, fields);
    expect(lines).toEqual(['  a_key: （なし） → "new"']);
  });

  it("snapshot lines skip empty keys", () => {
    const withValue = task({
      id: "t1",
      name: "A",
      fieldValues: { a_key: "x" },
    });
    expect(fieldValueSnapshotLinesForDiff(withValue, fields)).toEqual([
      '  a_key: "x"',
    ]);
  });

  it("treats matching fieldValues as equal", () => {
    const a = task({
      id: "t1",
      name: "A",
      fieldValues: { a_key: 1 },
    });
    const b = task({
      id: "t1",
      name: "A",
      fieldValues: { a_key: 1 },
    });
    expect(fieldValuesEqualForDiff(a, b)).toBe(true);
  });
});
