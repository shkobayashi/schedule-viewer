import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToday } from "./useToday";
import {
  addDays,
  isoDate,
  parseDate,
} from "../model/dates";
import {
  brokenLinkTaskIds,
  dropPredecessorLink,
  lineageTaskIds,
  tryAddPredecessorLink,
} from "../model/dependencies";
import {
  cloneSnapshot,
  createDocumentHistory,
  pushDocumentHistory,
  redoDocumentHistory,
  undoDocumentHistory,
  type DocumentHistory,
  type DocumentSnapshot,
} from "../model/history";
import {
  categoryCollapseKey,
  computeVisibleRows,
  findTaskById,
  groupCollapseKey,
  relaxFiltersForNewTask,
} from "../model/rows";
import { applyTaskNote } from "../model/taskNote";
import {
  appendMilestone,
  milestoneFilterAfterDelete,
  removeMilestone,
  validateNewMilestone,
} from "../model/milestones";
import {
  categoriesAfterDuplicate,
  categoriesAfterTaskEdit,
  cloneCategories,
  collectScheduleIds,
  findTaskOwner,
  insertTask,
  mapTasks,
  removeTask,
  renameCategory,
  renameGroup,
  appendGroupToCategory,
  canDeleteCategory,
  canDeleteGroup,
  insertCategoryAfter,
  insertGroupAfter,
  moveGroupToCategory,
  moveTaskToGroup,
  removeCategory,
  removeGroup,
  reorderCategories,
  reorderTaskInGroup,
  uniqueScheduleId,
  validateNewTask,
  validateTaskEdit,
  type TaskEditPatch,
} from "../model/tasks";
import {
  categoryIndex,
  categoryInsertMarkerY,
  visibleCategorySpans,
} from "../model/categoryOrder";
import {
  groupInsertMarkerY,
  visibleGroupSpans,
} from "../model/groupOrder";
import {
  insertMarkerY,
  taskIndexInGroup,
  visibleGroupTaskRows,
} from "../model/taskOrder";
import type { Member } from "../model/memberTypes";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  type Category,
  type Milestone,
  type ScheduleDocument,
  type ScheduleFilters,
  type ScheduleId,
  type Task,
} from "../model/types";
import {
  duplicateMemberNames,
  memberMapFromList,
  memberOptionLabel,
} from "../model/assigneeDisplay";

function initialSnapshot(
  categories: Category[],
  milestones: Milestone[],
): DocumentSnapshot {
  return {
    categories: cloneCategories(categories),
    milestones: milestones.map((milestone) => ({ ...milestone })),
  };
}

type EditingHierarchy = { kind: "category" | "group"; id: ScheduleId };

export type AddingHierarchy =
  | { kind: "category"; afterCategoryId: ScheduleId }
  | { kind: "group"; categoryId: ScheduleId; afterGroupId: ScheduleId | null };

function findDeletingHierarchyTarget(
  categories: Category[],
  deleting: { kind: "category" | "group"; id: ScheduleId } | null,
): { kind: "category" | "group"; name: string } | null {
  if (deleting == null) return null;
  if (deleting.kind === "category") {
    const category = categories.find((item) => item.id === deleting.id);
    if (!category) return null;
    return { kind: "category", name: category.name };
  }
  for (const category of categories) {
    const group = category.groups.find((item) => item.id === deleting.id);
    if (group) return { kind: "group", name: group.name };
  }
  return null;
}

function findHierarchyTarget(
  categories: Category[],
  editing: EditingHierarchy | null,
): { title: string; name: string } | null {
  if (editing == null) return null;
  if (editing.kind === "category") {
    const category = categories.find((item) => item.id === editing.id);
    if (!category) return null;
    return { title: "カテゴリ名", name: category.name };
  }
  for (const category of categories) {
    const group = category.groups.find((item) => item.id === editing.id);
    if (group) return { title: "グループ名", name: group.name };
  }
  return null;
}

export function useSchedule(
  initialTitle: string,
  initialCategories: Category[],
  initialMilestones: Milestone[],
  rowHeight: number,
  memberCatalog: Member[] | null,
  blockDocumentEditsRef?: { current: boolean },
) {
  const documentRef = useRef<DocumentSnapshot>(
    initialSnapshot(initialCategories, initialMilestones),
  );
  const historyRef = useRef<DocumentHistory>(createDocumentHistory());

  const [title, setTitle] = useState(() => initialTitle);
  const [categories, setCategories] = useState(
    () => documentRef.current.categories,
  );
  const [milestones, setMilestones] = useState(
    () => documentRef.current.milestones,
  );
  const [editingMilestoneId, setEditingMilestoneId] = useState<ScheduleId | null>(
    null,
  );
  const [editingHierarchy, setEditingHierarchy] = useState<EditingHierarchy | null>(
    null,
  );
  const [addingHierarchy, setAddingHierarchy] = useState<AddingHierarchy | null>(
    null,
  );
  const [deletingHierarchy, setDeletingHierarchy] = useState<
    { kind: "category" | "group"; id: ScheduleId } | null
  >(null);
  const [selectedTaskId, setSelectedTaskId] = useState<ScheduleId | null>(null);
  const [lineageTaskId, setLineageTaskId] = useState<ScheduleId | null>(null);
  const [filters, setFilters] = useState<ScheduleFilters>({
    assignee: "all",
    status: "all",
    confidence: "all",
    overdue: "all",
    relation: "all",
    milestone: "all",
    search: "",
    noteSearch: "",
  });
  const [editingTaskId, setEditingTaskId] = useState<ScheduleId | null>(null);
  const [duplicatingTaskId, setDuplicatingTaskId] = useState<ScheduleId | null>(
    null,
  );
  const [editingNoteTaskId, setEditingNoteTaskId] = useState<ScheduleId | null>(
    null,
  );
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [reorderPreview, setReorderPreview] = useState<
    | {
        kind: "task";
        taskId: ScheduleId;
        targetGroupId: ScheduleId;
        insertIndex: number;
      }
    | { kind: "category"; categoryId: ScheduleId; insertIndex: number }
    | {
        kind: "group";
        groupId: ScheduleId;
        targetCategoryId: ScheduleId;
        insertIndex: number;
      }
    | null
  >(null);
  const [diskEpoch, setDiskEpoch] = useState(0);
  const today = useToday();

  const pruneUiForDocument = useCallback((snapshot: DocumentSnapshot) => {
    setSelectedTaskId((current) =>
      current != null && findTaskById(snapshot.categories, current)
        ? current
        : null,
    );
    setEditingTaskId((current) =>
      current != null && findTaskById(snapshot.categories, current)
        ? current
        : null,
    );
    setDuplicatingTaskId((current) =>
      current != null && findTaskById(snapshot.categories, current)
        ? current
        : null,
    );
    setEditingNoteTaskId((current) =>
      current != null && findTaskById(snapshot.categories, current)
        ? current
        : null,
    );
    setLineageTaskId((current) => {
      if (current == null) return null;
      return lineageTaskIds(snapshot.categories, current) ? current : null;
    });
    setEditingMilestoneId((current) =>
      current != null &&
      snapshot.milestones.some((milestone) => milestone.id === current)
        ? current
        : null,
    );
    setEditingHierarchy((current) => {
      if (current == null) return null;
      if (current.kind === "category") {
        return snapshot.categories.some((category) => category.id === current.id)
          ? current
          : null;
      }
      const exists = snapshot.categories.some((category) =>
        category.groups.some((group) => group.id === current.id),
      );
      return exists ? current : null;
    });
  }, []);

  const applySnapshot = useCallback(
    (snapshot: DocumentSnapshot) => {
      const cloned = cloneSnapshot(snapshot);
      documentRef.current = cloned;
      setCategories(cloned.categories);
      setMilestones(cloned.milestones);
      setReorderPreview(null);
      pruneUiForDocument(cloned);
    },
    [pruneUiForDocument, setReorderPreview],
  );

  const commitDocument = useCallback(
    (buildNext: (current: DocumentSnapshot) => DocumentSnapshot) => {
      if (blockDocumentEditsRef?.current) return;
      const current = documentRef.current;
      const next = buildNext(current);
      const pushed = pushDocumentHistory(historyRef.current, current, next);
      if (!pushed) return;
      historyRef.current = pushed.history;
      if (!pushed.applied) return;
      documentRef.current = pushed.applied;
      setCategories(pushed.applied.categories);
      setMilestones(pushed.applied.milestones);
    },
    [blockDocumentEditsRef],
  );

  const commitCategories = useCallback(
    (update: (prev: Category[]) => Category[]) => {
      commitDocument((current) => ({
        ...current,
        categories: update(current.categories),
      }));
    },
    [commitDocument],
  );

  const commitMilestones = useCallback(
    (update: (prev: Milestone[]) => Milestone[]) => {
      commitDocument((current) => ({
        ...current,
        milestones: update(current.milestones),
      }));
    },
    [commitDocument],
  );

  const memberMap = useMemo(
    () => memberMapFromList(memberCatalog),
    [memberCatalog],
  );

  const assigneeFilterOptions = useMemo(() => {
    if (!memberCatalog || memberCatalog.length === 0) return [];
    const dupes = duplicateMemberNames(memberCatalog);
    return memberCatalog.map((member) => ({
      id: member.id,
      label: memberOptionLabel(member, dupes),
    }));
  }, [memberCatalog]);

  const knownMemberIds = useMemo(
    () => new Set(memberCatalog?.map((member) => member.id) ?? []),
    [memberCatalog],
  );

  const knownMilestoneIds = useMemo(
    () => new Set(milestones.map((milestone) => milestone.id)),
    [milestones],
  );

  const lineageIds = useMemo(
    () =>
      lineageTaskId == null
        ? null
        : lineageTaskIds(categories, lineageTaskId),
    [categories, lineageTaskId],
  );

  const baseVisibleRows = useMemo(
    () =>
      computeVisibleRows(
        categories,
        filters,
        collapsed,
        today,
        memberMap,
        rowHeight,
        lineageIds,
      ),
    [categories, collapsed, filters, lineageIds, memberMap, rowHeight, today],
  );

  const displayCategories = useMemo(() => {
    if (reorderPreview == null) return categories;
    if (reorderPreview.kind === "task") {
      const owner = findTaskOwner(categories, reorderPreview.taskId);
      if (owner?.groupId === reorderPreview.targetGroupId) {
        return reorderTaskInGroup(
          categories,
          reorderPreview.taskId,
          reorderPreview.insertIndex,
        );
      }
      return moveTaskToGroup(
        categories,
        reorderPreview.taskId,
        reorderPreview.targetGroupId,
        reorderPreview.insertIndex,
      );
    }
    if (reorderPreview.kind === "group") {
      return moveGroupToCategory(
        categories,
        reorderPreview.groupId,
        reorderPreview.targetCategoryId,
        reorderPreview.insertIndex,
      );
    }
    return reorderCategories(
      categories,
      reorderPreview.categoryId,
      reorderPreview.insertIndex,
    );
  }, [categories, reorderPreview]);

  const visibleRows = useMemo(
    () =>
      computeVisibleRows(
        displayCategories,
        filters,
        collapsed,
        today,
        memberMap,
        rowHeight,
        lineageIds,
      ),
    [
      collapsed,
      displayCategories,
      filters,
      lineageIds,
      memberMap,
      rowHeight,
      today,
    ],
  );

  const cancelReorder = useCallback(() => {
    setReorderPreview(null);
  }, [setReorderPreview]);

  const previewTaskReorder = useCallback(
    (taskId: ScheduleId, targetGroupId: ScheduleId, insertIndex: number) => {
      if (blockDocumentEditsRef?.current) return;
      setReorderPreview({
        kind: "task",
        taskId,
        targetGroupId,
        insertIndex,
      });
    },
    [blockDocumentEditsRef, setReorderPreview],
  );

  const commitTaskReorder = useCallback(
    (taskId: ScheduleId, targetGroupId: ScheduleId, insertIndex: number) => {
      if (blockDocumentEditsRef?.current) {
        setReorderPreview(null);
        return;
      }
      const owner = findTaskOwner(categories, taskId);
      setReorderPreview(null);
      if (owner == null) return;
      if (owner.groupId === targetGroupId) {
        const currentIndex = taskIndexInGroup(categories, taskId);
        if (currentIndex == null || currentIndex === insertIndex) return;
        commitCategories((prev) =>
          reorderTaskInGroup(prev, taskId, insertIndex),
        );
        return;
      }
      const next = moveTaskToGroup(
        categories,
        taskId,
        targetGroupId,
        insertIndex,
      );
      if (next === categories) return;
      commitCategories(() => next);
    },
    [blockDocumentEditsRef, categories, commitCategories, setReorderPreview],
  );

  const previewCategoryReorder = useCallback(
    (categoryId: ScheduleId, insertIndex: number) => {
      if (blockDocumentEditsRef?.current) return;
      setReorderPreview({ kind: "category", categoryId, insertIndex });
    },
    [blockDocumentEditsRef, setReorderPreview],
  );

  const commitCategoryReorder = useCallback(
    (categoryId: ScheduleId, insertIndex: number) => {
      if (blockDocumentEditsRef?.current) {
        setReorderPreview(null);
        return;
      }
      const currentIndex = categoryIndex(categories, categoryId);
      setReorderPreview(null);
      if (currentIndex == null || currentIndex === insertIndex) return;
      commitCategories((prev) => reorderCategories(prev, categoryId, insertIndex));
    },
    [blockDocumentEditsRef, categories, commitCategories, setReorderPreview],
  );

  const previewGroupReorder = useCallback(
    (
      groupId: ScheduleId,
      targetCategoryId: ScheduleId,
      insertIndex: number,
    ) => {
      if (blockDocumentEditsRef?.current) return;
      setReorderPreview({
        kind: "group",
        groupId,
        targetCategoryId,
        insertIndex,
      });
    },
    [blockDocumentEditsRef, setReorderPreview],
  );

  const commitGroupReorder = useCallback(
    (
      groupId: ScheduleId,
      targetCategoryId: ScheduleId,
      insertIndex: number,
    ) => {
      if (blockDocumentEditsRef?.current) {
        setReorderPreview(null);
        return;
      }
      setReorderPreview(null);
      const next = moveGroupToCategory(
        categories,
        groupId,
        targetCategoryId,
        insertIndex,
      );
      if (next === categories) return;
      commitCategories(() => next);
    },
    [blockDocumentEditsRef, categories, commitCategories, setReorderPreview],
  );

  const reorderInsertMarkerY = useMemo(() => {
    if (reorderPreview == null) return null;
    if (reorderPreview.kind === "category") {
      const spans = visibleCategorySpans(displayCategories, visibleRows, rowHeight);
      if (spans == null) return null;
      return categoryInsertMarkerY(reorderPreview.insertIndex, spans);
    }
    if (reorderPreview.kind === "group") {
      const spans = visibleGroupSpans(
        displayCategories,
        reorderPreview.targetCategoryId,
        visibleRows,
        rowHeight,
      );
      if (spans == null) return null;
      return groupInsertMarkerY(reorderPreview.insertIndex, spans);
    }
    const owner = findTaskOwner(displayCategories, reorderPreview.taskId);
    if (owner == null) return null;
    const groupRows = visibleGroupTaskRows(
      displayCategories,
      reorderPreview.targetGroupId,
      visibleRows,
    );
    if (groupRows == null) return null;
    return insertMarkerY(
      reorderPreview.insertIndex,
      rowHeight,
      groupRows,
    );
  }, [displayCategories, reorderPreview, rowHeight, visibleRows]);

  useEffect(() => {
    if (
      filters.assignee === "all" ||
      filters.assignee === UNASSIGNED_FILTER ||
      knownMemberIds.has(filters.assignee)
    ) {
      return;
    }
    setFilters((prev) => ({ ...prev, assignee: "all" }));
  }, [filters.assignee, knownMemberIds]);

  useEffect(() => {
    if (
      filters.milestone === "all" ||
      filters.milestone === NO_MILESTONE_FILTER ||
      knownMilestoneIds.has(filters.milestone)
    ) {
      return;
    }
    setFilters((prev) => ({ ...prev, milestone: "all" }));
  }, [filters.milestone, knownMilestoneIds]);

  const toggleCollapsed = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const updateFilters = useCallback((patch: Partial<ScheduleFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setSelectedTaskId(null);
  }, []);

  const selectTask = useCallback((id: ScheduleId | null) => {
    setSelectedTaskId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const toggleLineage = useCallback(() => {
    setLineageTaskId((current) => (current == null ? selectedTaskId : null));
  }, [selectedTaskId]);

  const showLineage = useCallback((taskId: ScheduleId) => {
    setLineageTaskId(taskId);
  }, []);

  const clearLineage = useCallback(() => {
    setLineageTaskId(null);
  }, []);

  const moveTaskByDays = useCallback(
    (taskId: ScheduleId, deltaDays: number) => {
      if (deltaDays === 0) return;
      commitCategories((prev) =>
        mapTasks(prev, (task) => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            start: isoDate(addDays(parseDate(task.start), deltaDays)),
            end: isoDate(addDays(parseDate(task.end), deltaDays)),
          };
        }),
      );
    },
    [commitCategories],
  );

  const setTaskStart = useCallback(
    (taskId: ScheduleId, start: string) => {
      commitCategories((prev) =>
        mapTasks(prev, (task) => {
          if (task.id !== taskId) return task;
          const end = start > task.end ? start : task.end;
          return { ...task, start, end };
        }),
      );
    },
    [commitCategories],
  );

  const moveMilestoneByDays = useCallback(
    (id: ScheduleId, deltaDays: number) => {
      if (deltaDays === 0) return;
      commitMilestones((prev) =>
        prev.map((milestone) =>
          milestone.id === id
            ? {
                ...milestone,
                date: isoDate(addDays(parseDate(milestone.date), deltaDays)),
              }
            : milestone,
        ),
      );
    },
    [commitMilestones],
  );

  const openMilestoneEdit = useCallback((id: ScheduleId) => {
    setEditingMilestoneId(id);
  }, []);

  const closeMilestoneEdit = useCallback(() => {
    setEditingMilestoneId(null);
  }, []);

  const saveMilestoneEdit = useCallback(
    (patch: { name: string; date: string; confidence: Milestone["confidence"] }) => {
      if (!patch.date || editingMilestoneId == null) return false;
      commitMilestones((prev) =>
        prev.map((milestone) =>
          milestone.id === editingMilestoneId
            ? {
                ...milestone,
                name: patch.name.trim() || milestone.name,
                date: patch.date,
                confidence: patch.confidence,
              }
            : milestone,
        ),
      );
      setEditingMilestoneId(null);
      return true;
    },
    [commitMilestones, editingMilestoneId],
  );

  const setMilestoneConfidence = useCallback(
    (id: ScheduleId, confidence: Milestone["confidence"]) => {
      commitMilestones((prev) =>
        prev.map((milestone) =>
          milestone.id === id ? { ...milestone, confidence } : milestone,
        ),
      );
    },
    [commitMilestones],
  );

  const editingMilestone = useMemo(
    () => milestones.find((milestone) => milestone.id === editingMilestoneId) ?? null,
    [editingMilestoneId, milestones],
  );

  const openHierarchyEdit = useCallback(
    (kind: "category" | "group", id: ScheduleId) => {
      setEditingHierarchy({ kind, id });
    },
    [],
  );

  const closeHierarchyEdit = useCallback(() => {
    setEditingHierarchy(null);
  }, []);

  const saveHierarchyName = useCallback(
    (rawName: string): string | null => {
      if (editingHierarchy == null) return "名前を保存できませんでした";
      const current = documentRef.current.categories;
      const result =
        editingHierarchy.kind === "category"
          ? renameCategory(current, editingHierarchy.id, rawName)
          : renameGroup(current, editingHierarchy.id, rawName);
      if (result.error) return result.error;
      if (result.changed) {
        commitCategories(() => result.categories);
      }
      setEditingHierarchy(null);
      return null;
    },
    [commitCategories, editingHierarchy],
  );

  const addingHierarchyTarget = useMemo((): {
    title: string;
    initialName: string;
  } | null => {
    if (addingHierarchy == null) return null;
    if (addingHierarchy.kind === "category") {
      return { title: "カテゴリを追加", initialName: "" };
    }
    return { title: "グループを追加", initialName: "" };
  }, [addingHierarchy]);

  const openAddCategoryAfter = useCallback((afterCategoryId: ScheduleId) => {
    setAddingHierarchy({ kind: "category", afterCategoryId });
  }, []);

  const openAddGroupToCategory = useCallback((categoryId: ScheduleId) => {
    setAddingHierarchy({ kind: "group", categoryId, afterGroupId: null });
  }, []);

  const openAddGroupAfter = useCallback((afterGroupId: ScheduleId) => {
    for (const category of documentRef.current.categories) {
      if (category.groups.some((group) => group.id === afterGroupId)) {
        setAddingHierarchy({
          kind: "group",
          categoryId: category.id,
          afterGroupId,
        });
        return;
      }
    }
  }, []);

  const closeAddingHierarchy = useCallback(() => {
    setAddingHierarchy(null);
  }, []);

  const saveHierarchyAdd = useCallback(
    (rawName: string): string | null => {
      if (addingHierarchy == null) return "追加できませんでした";
      const current = documentRef.current;
      const taken = collectScheduleIds(current.categories, current.milestones);
      if (addingHierarchy.kind === "category") {
        const newCategoryId = uniqueScheduleId(taken);
        taken.add(newCategoryId);
        const newGroupId = uniqueScheduleId(taken);
        const result = insertCategoryAfter(
          current.categories,
          addingHierarchy.afterCategoryId,
          rawName,
          newCategoryId,
          newGroupId,
        );
        if (result.error) return result.error;
        if (result.changed) {
          commitCategories(() => result.categories);
        }
        setAddingHierarchy(null);
        return null;
      }
      const newGroupId = uniqueScheduleId(taken);
      const result =
        addingHierarchy.afterGroupId == null
          ? appendGroupToCategory(
              current.categories,
              addingHierarchy.categoryId,
              rawName,
              newGroupId,
            )
          : insertGroupAfter(
              current.categories,
              addingHierarchy.afterGroupId,
              rawName,
              newGroupId,
            );
      if (result.error) return result.error;
      if (result.changed) {
        commitCategories(() => result.categories);
      }
      setAddingHierarchy(null);
      return null;
    },
    [addingHierarchy, commitCategories],
  );

  const openDeleteHierarchy = useCallback(
    (kind: "category" | "group", id: ScheduleId) => {
      setDeletingHierarchy({ kind, id });
    },
    [],
  );

  const closeDeleteHierarchy = useCallback(() => {
    setDeletingHierarchy(null);
  }, []);

  const deletingHierarchyTarget = findDeletingHierarchyTarget(
    categories,
    deletingHierarchy,
  );

  const confirmDeleteHierarchy = useCallback(() => {
    if (deletingHierarchy == null) return;
    const { kind, id } = deletingHierarchy;
    setDeletingHierarchy(null);
    commitCategories((prev) =>
      kind === "category" ? removeCategory(prev, id) : removeGroup(prev, id),
    );
  }, [commitCategories, deletingHierarchy]);

  const editingHierarchyTarget = findHierarchyTarget(categories, editingHierarchy);

  const setTaskEnd = useCallback(
    (taskId: ScheduleId, end: string) => {
      commitCategories((prev) =>
        mapTasks(prev, (task) => {
          if (task.id !== taskId) return task;
          const next = end < task.start ? task.start : end;
          return { ...task, end: next };
        }),
      );
    },
    [commitCategories],
  );

  const openEditDialog = useCallback((task: Task) => {
    setDuplicatingTaskId(null);
    setEditingTaskId(task.id);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingTaskId(null);
  }, []);

  const openDuplicateDialog = useCallback((taskId: ScheduleId) => {
    setEditingTaskId(null);
    setEditingNoteTaskId(null);
    setDuplicatingTaskId(taskId);
  }, []);

  const closeDuplicateDialog = useCallback(() => {
    setDuplicatingTaskId(null);
  }, []);

  const openTaskNoteDialog = useCallback((taskId: ScheduleId) => {
    setEditingNoteTaskId(taskId);
  }, []);

  const closeTaskNoteDialog = useCallback(() => {
    setEditingNoteTaskId(null);
  }, []);

  const setTaskConfidence = useCallback(
    (taskId: ScheduleId, confidence: Task["confidence"]) => {
      commitCategories((prev) =>
        mapTasks(prev, (task) =>
          task.id === taskId ? { ...task, confidence } : task,
        ),
      );
    },
    [commitCategories],
  );

  const saveTaskNote = useCallback(
    (taskId: ScheduleId, rawNote: string) => {
      commitCategories((prev) =>
        mapTasks(prev, (task) =>
          task.id === taskId ? applyTaskNote(task, rawNote) : task,
        ),
      );
    },
    [commitCategories],
  );

  const saveTaskEdit = useCallback(
    (patch: TaskEditPatch) => {
      if (editingTaskId == null) {
        return "編集対象のタスクがありません。";
      }
      const roundedProgress = Math.round(patch.progress);
      const fieldError = validateTaskEdit({
        name: patch.name,
        start: patch.start,
        end: patch.end,
        progress: roundedProgress,
      });
      if (fieldError) {
        return fieldError;
      }
      const result = categoriesAfterTaskEdit(
        documentRef.current.categories,
        documentRef.current.milestones,
        title,
        editingTaskId,
        { ...patch, progress: roundedProgress },
      );
      if (!result.ok) return result.message;
      commitCategories(() => result.categories);
      setEditingTaskId(null);
      return null;
    },
    [commitCategories, editingTaskId, title],
  );

  const addMilestone = useCallback(
    (input: {
      name: string;
      date: string;
      confidence: Milestone["confidence"];
    }): string | null => {
      const message = validateNewMilestone(input);
      if (message) return message;
      const id = uniqueScheduleId(
        collectScheduleIds(
          documentRef.current.categories,
          documentRef.current.milestones,
        ),
      );
      const milestone: Milestone = {
        id,
        name: input.name.trim(),
        date: input.date,
        confidence: input.confidence,
      };
      commitDocument((current) => ({
        ...current,
        milestones: appendMilestone(current.milestones, milestone),
      }));
      return null;
    },
    [commitDocument],
  );

  const deleteMilestone = useCallback(
    (id: ScheduleId) => {
      commitDocument((current) => {
        const next = removeMilestone(
          current.categories,
          current.milestones,
          id,
        );
        return {
          ...current,
          categories: next.categories,
          milestones: next.milestones,
        };
      });
      setFilters((prev) => ({
        ...prev,
        milestone: milestoneFilterAfterDelete(prev.milestone, id),
      }));
    },
    [commitDocument],
  );

  const addTask = useCallback(
    (input: {
      name: string;
      start: string;
      end: string;
      category: string;
      group: string;
    }) => {
      const currentCategories = documentRef.current.categories;
      if (validateNewTask(input, currentCategories)) return null;
      const name = input.name.trim();
      const id = uniqueScheduleId(
        collectScheduleIds(currentCategories, documentRef.current.milestones),
      );
      const task: Task = {
        id,
        name,
        start: input.start,
        end: input.end,
        assigneeId: null,
        status: "not-started",
        progress: 0,
        confidence: "tentative",
        predecessors: [],
        milestoneId: null,
      };
      const place = { category: input.category, group: input.group };
      const category = currentCategories.find((item) => item.name === place.category);
      const group = category?.groups.find((item) => item.name === place.group);
      commitCategories((prev) => insertTask(prev, task, place));
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (category) next.delete(categoryCollapseKey(category.id));
        if (group) next.delete(groupCollapseKey(group.id));
        return next;
      });
      setFilters((prev) =>
        relaxFiltersForNewTask(prev, task, today, memberMap),
      );
      setLineageTaskId(null);
      setSelectedTaskId(id);
      setEditingTaskId(null);
      setDuplicatingTaskId(null);
      return id;
    },
    [commitCategories, memberMap, today],
  );

  const duplicateTask = useCallback(
    (patch: TaskEditPatch): { ok: true; id: ScheduleId } | { ok: false; error: string } => {
      if (duplicatingTaskId == null) {
        return { ok: false, error: "複製元のタスクがありません。" };
      }
      const roundedProgress = Math.round(patch.progress);
      const fieldError = validateTaskEdit({
        name: patch.name,
        start: patch.start,
        end: patch.end,
        progress: roundedProgress,
      });
      if (fieldError) return { ok: false, error: fieldError };
      const current = documentRef.current;
      const id = uniqueScheduleId(
        collectScheduleIds(current.categories, current.milestones),
      );
      const result = categoriesAfterDuplicate(
        current.categories,
        current.milestones,
        title,
        duplicatingTaskId,
        id,
        { ...patch, progress: roundedProgress },
      );
      if (!result.ok) return { ok: false, error: result.message };
      const owner = findTaskOwner(current.categories, duplicatingTaskId);
      const saved = findTaskById(result.categories, id);
      commitCategories(() => result.categories);
      if (owner) {
        setCollapsed((prev) => {
          const next = new Set(prev);
          next.delete(categoryCollapseKey(owner.categoryId));
          next.delete(groupCollapseKey(owner.groupId));
          return next;
        });
      }
      if (saved) {
        setFilters((prev) =>
          relaxFiltersForNewTask(
            prev,
            saved,
            today,
            memberMap,
            brokenLinkTaskIds(result.categories),
          ),
        );
      }
      setLineageTaskId(null);
      setSelectedTaskId(id);
      setEditingTaskId(null);
      setDuplicatingTaskId(null);
      return { ok: true, id };
    },
    [commitCategories, duplicatingTaskId, memberMap, title, today],
  );

  const addPredecessorLink = useCallback(
    (predecessorId: ScheduleId, successorId: ScheduleId): string | null => {
      const result = tryAddPredecessorLink(
        documentRef.current.categories,
        predecessorId,
        successorId,
      );
      if (!result.ok) return result.message;
      commitCategories(() => result.categories);
      return null;
    },
    [commitCategories],
  );

  const removePredecessorLink = useCallback(
    (predecessorId: ScheduleId, successorId: ScheduleId) => {
      commitCategories((prev) =>
        dropPredecessorLink(prev, predecessorId, successorId),
      );
    },
    [commitCategories],
  );

  const deleteTask = useCallback(
    (taskId: ScheduleId) => {
      commitCategories((prev) => removeTask(prev, taskId));
      setSelectedTaskId((current) => (current === taskId ? null : current));
      setEditingTaskId((current) => (current === taskId ? null : current));
      setDuplicatingTaskId((current) => (current === taskId ? null : current));
      setEditingNoteTaskId((current) => (current === taskId ? null : current));
      setLineageTaskId((current) => (current === taskId ? null : current));
    },
    [commitCategories],
  );

  const replaceDocument = useCallback(
    (document: ScheduleDocument) => {
      historyRef.current = createDocumentHistory();
      const snapshot = initialSnapshot(
        document.categories,
        document.milestones,
      );
      documentRef.current = snapshot;
      setTitle(document.title);
      setCategories(snapshot.categories);
      setMilestones(snapshot.milestones);
      setSelectedTaskId(null);
      setLineageTaskId(null);
      setEditingTaskId(null);
      setDuplicatingTaskId(null);
      setEditingNoteTaskId(null);
      setEditingMilestoneId(null);
      setCollapsed(new Set());
      setFilters({
        assignee: "all",
        status: "all",
        confidence: "all",
        overdue: "all",
        relation: "all",
        milestone: "all",
        search: "",
        noteSearch: "",
      });
      setReorderPreview(null);
    },
    [setReorderPreview],
  );

  const reloadDocumentFromDisk = useCallback(
    (document: ScheduleDocument) => {
      historyRef.current = createDocumentHistory();
      const snapshot = initialSnapshot(
        document.categories,
        document.milestones,
      );
      documentRef.current = snapshot;
      setTitle(document.title);
      setCategories(snapshot.categories);
      setMilestones(snapshot.milestones);
      setDiskEpoch((epoch) => epoch + 1);
      setReorderPreview(null);
      pruneUiForDocument(snapshot);
    },
    [pruneUiForDocument, setReorderPreview],
  );

  const undo = useCallback(() => {
    if (blockDocumentEditsRef?.current) return;
    const result = undoDocumentHistory(historyRef.current, documentRef.current);
    if (!result) return;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
  }, [applySnapshot, blockDocumentEditsRef]);

  const redo = useCallback(() => {
    if (blockDocumentEditsRef?.current) return;
    const result = redoDocumentHistory(historyRef.current, documentRef.current);
    if (!result) return;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
  }, [applySnapshot, blockDocumentEditsRef]);

  const editingTask = useMemo(
    () => findTaskById(categories, editingTaskId),
    [categories, editingTaskId],
  );

  const duplicatingTask = useMemo(
    () => findTaskById(categories, duplicatingTaskId),
    [categories, duplicatingTaskId],
  );

  const editingNoteTask = useMemo(
    () => findTaskById(categories, editingNoteTaskId),
    [categories, editingNoteTaskId],
  );

  const lineageTask = useMemo(
    () => findTaskById(categories, lineageTaskId),
    [categories, lineageTaskId],
  );

  return {
    title,
    categories,
    milestones,
    editingMilestone,
    editingHierarchyTarget,
    openHierarchyEdit,
    closeHierarchyEdit,
    saveHierarchyName,
    addingHierarchyTarget,
    openAddCategoryAfter,
    openAddGroupToCategory,
    openAddGroupAfter,
    closeAddingHierarchy,
    saveHierarchyAdd,
    canDeleteCategory: (id: ScheduleId) => canDeleteCategory(categories, id),
    canDeleteGroup: (id: ScheduleId) => canDeleteGroup(categories, id),
    openDeleteHierarchy,
    closeDeleteHierarchy,
    deletingHierarchyTarget,
    confirmDeleteHierarchy,
    moveMilestoneByDays,
    openMilestoneEdit,
    closeMilestoneEdit,
    saveMilestoneEdit,
    setMilestoneConfidence,
    assigneeFilterOptions,
    visibleRows,
    baseVisibleRows,
    reorderPreview,
    reorderInsertMarkerY,
    previewTaskReorder,
    commitTaskReorder,
    previewCategoryReorder,
    commitCategoryReorder,
    previewGroupReorder,
    commitGroupReorder,
    cancelReorder,
    toggleCollapsed,
    filters,
    updateFilters,
    selectedTaskId,
    selectTask,
    clearSelection,
    lineageTask,
    toggleLineage,
    showLineage,
    clearLineage,
    moveTaskByDays,
    setTaskStart,
    setTaskEnd,
    openEditDialog,
    closeEditDialog,
    openDuplicateDialog,
    closeDuplicateDialog,
    duplicatingTask,
    saveTaskEdit,
    duplicateTask,
    setTaskConfidence,
    editingTask,
    editingNoteTask,
    openTaskNoteDialog,
    closeTaskNoteDialog,
    saveTaskNote,
    addTask,
    addPredecessorLink,
    removePredecessorLink,
    deleteTask,
    addMilestone,
    deleteMilestone,
    replaceDocument,
    reloadDocumentFromDisk,
    diskEpoch,
    undo,
    redo,
    today,
  };
}
