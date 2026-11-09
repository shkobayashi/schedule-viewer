import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyBulkTaskEdit } from "../model/bulkTaskEdit";
import {
  removeConnectionByPair,
  tryAddConnection,
  tryUpdateConnectionLabel,
} from "../model/connections";
import { brokenLinkTaskIdsFromTasks } from "../model/dependencies";
import { collectTasksFromDocument, hierarchyLayoutContext } from "../model/hierarchy";
import { categoriesAfterDuplicate } from "../model/tasks";
import { computeVisibleRows } from "../model/rows";
import { parseScheduleText } from "../model/scheduleFile";
import type { ScheduleFilters, ScheduleId } from "../model/types";
import type { TaskEditPatch } from "../model/tasks";
import { openHeadlessSchedule, type HeadlessSchedule } from "./headlessScheduleSession";
import { commitDocument } from "./headlessScheduleSessionTestUtil";

const CONNECTIONS_JSON = `${import.meta.dirname}/../../examples/connections/schedule.json`;
const CONN_TASK_A = "c5010001-0000-4000-8000-000000000001";
const CONN_TASK_B = "c5010001-0000-4000-8000-000000000002";
const CONN_ONLY_A = "c5010001-0000-4000-8000-000000000005";
const CONN_ONLY_B = "c5010001-0000-4000-8000-000000000007";

function openConnections(): HeadlessSchedule {
  return openHeadlessSchedule(readFileSync(CONNECTIONS_JSON, "utf8"));
}

function countConnectionDeleteLines(diffText: string): number {
  return (diffText.match(/^削除 繋がり$/gm) ?? []).length;
}

describe("headlessScheduleSession connections regression", () => {
  it("adds one connection pair and rejects blank labels", async () => {
    const session = openConnections();
    const document = session.getDocument();
    const anchor = "c5010001-0000-4000-8000-000000000018";
    const other = "c5010001-0000-4000-8000-000000000019";

    const blankSpace = tryAddConnection(document.connections, anchor, other, " ");
    expect(blankSpace.ok).toBe(false);
    if (!blankSpace.ok) {
      expect(blankSpace.message).toBe("繋がりの言葉を入力してください。");
    }
    const blankDouble = tryAddConnection(document.connections, anchor, other, "  ");
    expect(blankDouble.ok).toBe(false);
    if (!blankDouble.ok) {
      expect(blankDouble.message).toBe("繋がりの言葉を入力してください。");
    }

    const added = tryAddConnection(document.connections, anchor, other, "回帰の繋がり");
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const updated = tryUpdateConnectionLabel(added.connections, anchor, other, "更新後");
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    await commitDocument(session, { ...document, connections: updated.connections });
    expect(
      session.getDocument().connections?.find(
        (c) => c.taskIds.includes(anchor) && c.taskIds.includes(other),
      )?.label,
    ).toBe("更新後");

    const removed = removeConnectionByPair(session.getDocument().connections, anchor, other);
    await commitDocument(session, { ...session.getDocument(), connections: removed });
    expect(
      session.getDocument().connections?.some(
        (c) => c.taskIds.includes(anchor) && c.taskIds.includes(other),
      ),
    ).toBe(false);
  });

  it("removeConnectionByPair undo restores and diffText has exactly one 削除 繋がり", async () => {
    const session = openConnections();
    await session.run({ tool: "reload" });
    const document = session.getDocument();
    const [a, b] = document.connections![0]!.taskIds;
    const committed = await commitDocument(session, {
      ...document,
      connections: removeConnectionByPair(document.connections, a, b),
    });
    expect(countConnectionDeleteLines(committed.diffText)).toBe(1);
    const undone = await session.run({ tool: "history", action: "undo" });
    expect(undone.ok).toBe(true);
    expect(session.getDocument().connections?.length).toBe(document.connections?.length);
  });

  it("keeps connections across duplicate and bulk edit", async () => {
    const session = openConnections();
    const document = session.getDocument();
    const connectionsBefore = document.connections ?? [];
    const source = document.categories
      .flatMap((c) => c.groups.flatMap((g) => g.tasks))
      .find((t) => t.id === CONN_TASK_A);
    if (source == null) throw new Error("source task");
    const patch: TaskEditPatch = {
      name: `${source.name}（複製）`,
      start: source.start,
      end: source.end,
      assigneeIds: [...source.assigneeIds],
      status: source.status,
      progress: source.progress,
      confidence: source.confidence,
      predecessors: [],
      successors: [],
      milestoneId: source.milestoneId,
      note: source.note ?? "",
    };
    const duplicateId = "c5010001-0000-4000-8000-000000000099";
    const dup = categoriesAfterDuplicate(
      document.categories,
      document.milestones,
      document.title,
      source.id,
      duplicateId,
      patch,
    );
    expect(dup.ok).toBe(true);
    if (!dup.ok) return;
    await commitDocument(session, {
      ...document,
      categories: dup.categories,
    });
    expect(session.getDocument().connections).toEqual(connectionsBefore);
    for (const pair of session.getDocument().connections ?? []) {
      expect(pair.taskIds.includes(duplicateId)).toBe(false);
    }

    const bulk = applyBulkTaskEdit(
      session.getDocument().categories,
      session.getDocument().milestones,
      session.getDocument().title,
      [CONN_TASK_A, CONN_TASK_B],
      { addTags: ["回帰"] },
    );
    expect(bulk.ok).toBe(true);
    if (!bulk.ok) return;
    await commitDocument(session, {
      ...session.getDocument(),
      categories: bulk.categories,
    });
    expect(session.getDocument().connections).toEqual(connectionsBefore);
    for (const pair of session.getDocument().connections ?? []) {
      expect(pair.taskIds.includes(duplicateId)).toBe(false);
    }
  });

  it("TC-EDIT-23c: relation broken hides connection-only task rows on connections schedule", () => {
    const parsed = parseScheduleText(readFileSync(CONNECTIONS_JSON, "utf8"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const document = parsed.document;
    const tasks = collectTasksFromDocument(document);
    const broken = brokenLinkTaskIdsFromTasks(tasks);
    const filters: ScheduleFilters = {
      assignee: "all",
      status: "all",
      confidence: "all",
      overdue: "all",
      relation: "broken",
      milestone: "all",
      tags: [],
      search: "",
      noteSearch: "",
      fieldFilters: {},
    };
    const layout = hierarchyLayoutContext(document);
    const rows = computeVisibleRows(
      document.categories,
      filters,
      new Set(),
      "2026-11-01",
      null,
      undefined,
      null,
      undefined,
      {
        levels: layout.levels,
        outline: document.outline,
        useLegacyCategoryRows: layout.useLegacyCategoryRows,
        levelCount: layout.levelCount,
      },
    );
    const visible = new Set(
      rows.filter((row) => row.type === "task").map((row) => row.task.id),
    );
    expect(visible.size).toBe(broken.size);
    for (const id of [CONN_ONLY_A, CONN_ONLY_B] as ScheduleId[]) {
      expect(broken.has(id)).toBe(false);
      expect(visible.has(id)).toBe(false);
    }
    for (const id of broken) {
      expect(visible.has(id)).toBe(true);
    }
  });
});
