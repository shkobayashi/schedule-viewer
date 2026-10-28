import { isTaskNode } from "./hierarchy";
import type { MemberId } from "./memberTypes";
import type { OutlineRoot, ScheduleDocument, Task } from "./types";

/** JSON の assigneeId。空は null、一人は文字列、二人以上は配列。 */
export type AssigneeIdJson = MemberId | MemberId[] | null;

export function assigneeIdsFromJson(value: AssigneeIdJson): MemberId[] {
  if (value == null) return [];
  if (typeof value === "string") return [value];
  return [...value];
}

/** 読み込み前の assigneeId と正規化後の assigneeIds の両方を受け取る。 */
export function taskAssigneeIds(
  task: Pick<Task, "assigneeIds"> & { assigneeId?: AssigneeIdJson },
): MemberId[] {
  if (task.assigneeIds != null) {
    return [...task.assigneeIds];
  }
  return assigneeIdsFromJson(task.assigneeId ?? null);
}

export function assigneeIdToJson(ids: readonly MemberId[]): AssigneeIdJson {
  if (ids.length === 0) return null;
  if (ids.length === 1) return ids[0]!;
  return [...ids];
}

export function assigneeIdsEqual(
  a: readonly MemberId[],
  b: readonly MemberId[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

export function formatAssigneeIdsForDiff(ids: readonly MemberId[]): string {
  if (ids.length === 0) return "null";
  return ids.join(", ");
}

type TaskWithLegacyAssignee = {
  assigneeId?: AssigneeIdJson;
  assigneeIds?: MemberId[];
};

function normalizeTaskAssigneeFields(task: TaskWithLegacyAssignee): {
  assigneeIds: MemberId[];
} {
  if (task.assigneeIds != null) {
    return { assigneeIds: [...task.assigneeIds] };
  }
  return { assigneeIds: assigneeIdsFromJson(task.assigneeId ?? null) };
}

function stripLegacyAssignee<T extends TaskWithLegacyAssignee>(
  task: T,
): Omit<T, "assigneeId" | "assigneeIds"> & { assigneeIds: MemberId[] } {
  const { assigneeId: _legacy, assigneeIds: _ids, ...rest } = task;
  void _legacy;
  void _ids;
  return { ...rest, ...normalizeTaskAssigneeFields(task) };
}

export function normalizeTaskAssignees(task: Task): Task {
  return stripLegacyAssignee(task) as Task;
}

function normalizeOutlineAssignees(nodes: OutlineRoot): OutlineRoot {
  return nodes.map((node) => {
    if (isTaskNode(node)) {
      return normalizeTaskAssignees(node);
    }
    return {
      ...node,
      children: normalizeOutlineAssignees(node.children),
    };
  });
}

export function normalizeAssigneesInDocument(doc: ScheduleDocument): ScheduleDocument {
  const categories = doc.categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map((task) => normalizeTaskAssignees(task)),
    })),
  }));
  const outline =
    doc.outline != null ? normalizeOutlineAssignees(doc.outline) : doc.outline;
  return { ...doc, categories, outline };
}

export function validateAssigneeIdsSemantics(
  ids: readonly MemberId[],
  path: string,
): { path: string; message: string } | null {
  const seen = new Set<MemberId>();
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i]!;
    if (seen.has(id)) {
      return {
        path: `${path}/assigneeId`,
        message: "担当者 ID が重複しています",
      };
    }
    seen.add(id);
  }
  return null;
}

export function moveAssigneeId(
  ids: readonly MemberId[],
  index: number,
  direction: -1 | 1,
): MemberId[] {
  const next = [...ids];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  const tmp = next[index]!;
  next[index] = next[target]!;
  next[target] = tmp;
  return next;
}

export function removeAssigneeAt(
  ids: readonly MemberId[],
  index: number,
): MemberId[] {
  return ids.filter((_, i) => i !== index);
}

export function appendAssigneeId(
  ids: readonly MemberId[],
  id: MemberId,
): MemberId[] {
  if (ids.includes(id)) return [...ids];
  return [...ids, id];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function taskRecordForSchemaValidation(
  task: Record<string, unknown>,
): Record<string, unknown> {
  const { assigneeIds, assigneeId, ...rest } = task;
  let ids: MemberId[];
  if (Array.isArray(assigneeIds)) {
    ids = assigneeIds as MemberId[];
  } else {
    ids = assigneeIdsFromJson((assigneeId as AssigneeIdJson | undefined) ?? null);
  }
  return { ...rest, assigneeId: assigneeIdToJson(ids) };
}

function outlineNodesForSchemaValidation(nodes: unknown[]): unknown[] {
  return nodes.map((node) => {
    if (!isRecord(node)) return node;
    if (Array.isArray(node.children)) {
      return {
        ...node,
        children: outlineNodesForSchemaValidation(node.children),
      };
    }
    if ("start" in node && "end" in node) {
      return taskRecordForSchemaValidation(node);
    }
    return node;
  });
}

/** スキーマ検証用に assigneeIds を assigneeId へ戻す。読み込み後の正規化は normalizeAssigneesInDocument。 */
export function scheduleInputForSchemaValidation(data: unknown): unknown {
  if (!isRecord(data)) return data;
  const next: Record<string, unknown> = { ...data };
  if (Array.isArray(next.categories)) {
    next.categories = next.categories.map((category) => {
      if (!isRecord(category)) return category;
      return {
        ...category,
        groups: Array.isArray(category.groups)
          ? category.groups.map((group) => {
              if (!isRecord(group)) return group;
              return {
                ...group,
                tasks: Array.isArray(group.tasks)
                  ? group.tasks.map((task) =>
                      isRecord(task) ? taskRecordForSchemaValidation(task) : task,
                    )
                  : group.tasks,
              };
            })
          : category.groups,
      };
    });
  }
  if (Array.isArray(next.outline)) {
    next.outline = outlineNodesForSchemaValidation(next.outline);
  }
  return next;
}

function checkTaskAssigneeIdEmptyArray(
  task: Record<string, unknown>,
  taskPath: string,
): { path: string; message: string } | null {
  const value = task.assigneeId;
  if (Array.isArray(value) && value.length === 0) {
    return {
      path: `${taskPath}/assigneeId`,
      message: "担当者の配列は空にできません",
    };
  }
  const ids = task.assigneeIds;
  if (Array.isArray(ids) && ids.length === 0) {
    return {
      path: `${taskPath}/assigneeIds`,
      message: "担当者の配列は空にできません",
    };
  }
  return null;
}

function collectAssigneeIdInputIssuesInTasks(
  tasks: unknown[],
  taskPathPrefix: string,
): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  for (let ti = 0; ti < tasks.length; ti += 1) {
    const task = tasks[ti];
    if (!isRecord(task)) continue;
    const issue = checkTaskAssigneeIdEmptyArray(task, `${taskPathPrefix}/${ti}`);
    if (issue) issues.push(issue);
  }
  return issues;
}

function collectAssigneeIdInputIssuesInOutline(
  nodes: unknown[],
  pathPrefix: string,
): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  for (let ni = 0; ni < nodes.length; ni += 1) {
    const node = nodes[ni];
    if (!isRecord(node)) continue;
    const nodePath = `${pathPrefix}/${ni}`;
    if (Array.isArray(node.children)) {
      issues.push(
        ...collectAssigneeIdInputIssuesInOutline(node.children, `${nodePath}/children`),
      );
    }
    if ("start" in node && "end" in node) {
      const issue = checkTaskAssigneeIdEmptyArray(node, nodePath);
      if (issue) issues.push(issue);
    }
  }
  return issues;
}

/** スキーマ通過後、空の assigneeId 配列を拒否する。 */
export function validateAssigneeIdInputSemantics(
  data: unknown,
): { path: string; message: string }[] {
  if (!isRecord(data)) return [];
  const issues: { path: string; message: string }[] = [];
  if (Array.isArray(data.categories)) {
    for (let ci = 0; ci < data.categories.length; ci += 1) {
      const category = data.categories[ci];
      if (!isRecord(category) || !Array.isArray(category.groups)) continue;
      for (let gi = 0; gi < category.groups.length; gi += 1) {
        const group = category.groups[gi];
        if (!isRecord(group) || !Array.isArray(group.tasks)) continue;
        issues.push(
          ...collectAssigneeIdInputIssuesInTasks(
            group.tasks,
            `/categories/${ci}/groups/${gi}/tasks`,
          ),
        );
      }
    }
  }
  if (Array.isArray(data.outline)) {
    issues.push(...collectAssigneeIdInputIssuesInOutline(data.outline, "/outline"));
  }
  return issues;
}
