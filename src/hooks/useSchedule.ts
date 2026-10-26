import { BUILTIN_STATUS_ITEMS, defaultStatusId, type StatusItem } from "../model/statusCatalog";
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
  cloneOutlineRoot,
  findTaskInDocument,
  hierarchyLayoutContext,
  levelBannerText,
  scheduleStoresTasksInOutline,
  taskParentBranchesInOutline,
} from "../model/hierarchy";
import {
  findOutlineTaskOwner,
  insertTaskInOutline,
  mapAllTasksInOutline,
  moveTaskToOutlineParent,
  outlineAfterTaskEdit,
  removeTaskFromOutline,
  reorderTaskInOutlineParent,
  tasksInOutlineParent,
  collectOutlineIds,
} from "../model/outlineTasks";
import {
  categoryCollapseKey,
  computeVisibleRows,
  findTaskById,
  groupCollapseKey,
  relaxFiltersForNewTask,
} from "../model/rows";
import { applyTaskNote } from "../model/taskNote";
import {
  collectTagsInDocumentOrder,
  pruneSelectedTags,
} from "../model/taskTags";
import {
  hiddenMilestoneGroupIdsForShowOnly,
  pruneHiddenMilestoneGroupIds,
} from "../model/filterChips";
import {
  collapsedIdsFromSet,
  collapsedSetFromIds,
  defaultScheduleFilterViewState,
  type ScheduleFilterViewState,
  type SearchField,
} from "../model/scheduleFilterPersistence";
import type { ReplaceScheduleDocumentResult } from "../model/replaceSchedule";
import { serializeScheduleDocument } from "../model/scheduleFile";
import {
  resolveScheduleTitleCommit,
  type ScheduleTitleCommitResult,
} from "../model/scheduleTitleEdit";
import {
  appendMilestone,
  applyMilestoneEdit,
  ensureMilestoneGroupForAdd,
  milestoneFilterAfterDelete,
  removeMilestone,
  validateNewMilestone,
} from "../model/milestones";
import {
  addTaskTag,
  categoriesAfterDuplicate,
  categoriesAfterTaskEdit,
  cloneCategories,
  collectScheduleIds,
  findTaskOwner,
  insertTask,
  mapTasks,
  removeTaskTag,
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
  SCHEDULE_SCHEMA_VERSION,
  type Category,
  type Milestone,
  type MilestoneGroup,
  type OutlineRoot,
  type ScheduleDocument,
  type ScheduleFilters,
  type ScheduleId,
  type ScheduleLevelDef,
  type Task,
  type VisibleRow,
} from "../model/types";
import {
  duplicateMemberNames,
  memberMapFromList,
  memberOptionLabel,
} from "../model/assigneeDisplay";
import {
  applyBulkTaskEdit,
  type BulkTaskDraft,
} from "../model/bulkTaskEdit";
import {
  emptyTaskSelection,
  extendSelectionByArrow,
  moveSelectionByArrow,
  primarySelectedTaskId,
  pruneTaskSelection,
  removeDeletedTasksFromSelection,
  selectTaskClick,
  selectTaskContextMenu,
  singleTaskSelection,
  type TaskClickModifiers,
  type TaskSelectionState,
} from "../model/taskSelection";

function snapshotFromDocument(doc: ScheduleDocument): DocumentSnapshot {
  return {
    title: doc.title,
    categories: cloneCategories(doc.categories ?? []),
    milestoneGroups: doc.milestoneGroups.map((group) => ({ ...group })),
    milestones: doc.milestones.map((milestone) => ({ ...milestone })),
    levels: doc.levels?.map((level) => ({ ...level })),
    outline:
      doc.outline != null ? cloneOutlineRoot(doc.outline) : undefined,
  };
}

function initialSnapshot(
  title: string,
  categories: Category[],
  milestoneGroups: MilestoneGroup[],
  milestones: Milestone[],
): DocumentSnapshot {
  return snapshotFromDocument({
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    categories,
    milestoneGroups,
    milestones,
  });
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
  initialMilestoneGroups: MilestoneGroup[],
  initialMilestones: Milestone[],
  rowHeight: number,
  memberCatalog: Member[] | null,
  memberCatalogSettled: boolean,
  blockDocumentEditsRef?: { current: boolean },
  onHistoryUndoApplied?: (landed: DocumentSnapshot) => void,
  onHistoryRedoApplied?: (landed: DocumentSnapshot) => void,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
  statusCatalogSettled = true,
) {
  const documentRef = useRef<DocumentSnapshot>(
    initialSnapshot(
      initialTitle,
      initialCategories,
      initialMilestoneGroups,
      initialMilestones,
    ),
  );
  const historyRef = useRef<DocumentHistory>(createDocumentHistory());
  const [historyUi, setHistoryUi] = useState({ canUndo: false, canRedo: false });
  const syncHistoryUi = useCallback(() => {
    setHistoryUi({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    });
  }, []);

  const [title, setTitle] = useState(() => initialTitle);
  const [categories, setCategories] = useState(
    () => documentRef.current.categories,
  );
  const [milestoneGroups, setMilestoneGroups] = useState(
    () => documentRef.current.milestoneGroups,
  );
  const [milestones, setMilestones] = useState(
    () => documentRef.current.milestones,
  );
  const [levels, setLevels] = useState<ScheduleLevelDef[] | undefined>(
    () => documentRef.current.levels,
  );
  const [outline, setOutline] = useState<OutlineRoot | undefined>(
    () => documentRef.current.outline,
  );
  const [hiddenMilestoneGroupIds, setHiddenMilestoneGroupIds] = useState<
    ScheduleId[]
  >([]);
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
  const [taskSelection, setTaskSelection] = useState<TaskSelectionState>(
    () => emptyTaskSelection(),
  );
  const selectedTaskIds = taskSelection.ids;
  const selectedTaskId = primarySelectedTaskId(taskSelection);
  const [lineageTaskId, setLineageTaskId] = useState<ScheduleId | null>(null);
  const [filters, setFilters] = useState<ScheduleFilters>(
    () => defaultScheduleFilterViewState().filters,
  );
  const [searchField, setSearchField] = useState<SearchField>("name");
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
    setTaskSelection((current) =>
      pruneTaskSelection(snapshot.categories, current),
    );
    setDuplicatingTaskId((current) =>
      current != null &&
      findTaskInDocument(snapshot.categories, snapshot.outline, current)
        ? current
        : null,
    );
    setEditingNoteTaskId((current) =>
      current != null &&
      findTaskInDocument(snapshot.categories, snapshot.outline, current)
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
      setTitle(cloned.title);
      setCategories(cloned.categories);
      setMilestoneGroups(cloned.milestoneGroups);
      setMilestones(cloned.milestones);
      setLevels(cloned.levels);
      setOutline(cloned.outline);
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
      syncHistoryUi();
      if (!pushed.applied) return;
      documentRef.current = pushed.applied;
      setCategories(pushed.applied.categories);
      setMilestoneGroups(pushed.applied.milestoneGroups);
      setMilestones(pushed.applied.milestones);
      setLevels(pushed.applied.levels);
      setOutline(pushed.applied.outline);
    },
    [blockDocumentEditsRef, syncHistoryUi],
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

  const commitTitle = useCallback(
    (rawInput: string): ScheduleTitleCommitResult => {
      const resolved = resolveScheduleTitleCommit(
        documentRef.current.title,
        rawInput,
      );
      if (resolved.kind !== "changed") {
        return resolved;
      }
      if (blockDocumentEditsRef?.current) {
        return { kind: "unchanged" };
      }
      commitDocument((current) => ({ ...current, title: resolved.title }));
      setTitle(resolved.title);
      return resolved;
    },
    [blockDocumentEditsRef, commitDocument],
  );

  const getCanonicalJson = useCallback(
    () =>
      serializeScheduleDocument(
        documentRef.current.title,
        documentRef.current.categories,
        documentRef.current.milestoneGroups,
        documentRef.current.milestones,
        documentRef.current.levels,
        documentRef.current.outline,
      ),
    [],
  );

  const hierarchyLayout = useMemo(
    () =>
      hierarchyLayoutContext({
        schemaVersion: SCHEDULE_SCHEMA_VERSION,
        title,
        categories,
        milestoneGroups,
        milestones,
        levels,
        outline,
      }),
    [categories, levels, milestoneGroups, milestones, outline, title],
  );

  const hierarchyRowOptions = useMemo(
    () => ({
      levels: levels ?? null,
      outline,
      useLegacyCategoryRows: hierarchyLayout.useLegacyCategoryRows,
      levelCount: hierarchyLayout.levelCount,
    }),
    [hierarchyLayout, levels, outline],
  );

  const hierarchyLevelBanner = useMemo(() => {
    if (levels == null || levels.length === 0) return null;
    if (!hierarchyLayout.aligned) return null;
    return levelBannerText(levels);
  }, [hierarchyLayout.aligned, levels]);

  const usesOutlineStorage = useMemo(
    () =>
      scheduleStoresTasksInOutline({
        categories,
        levels,
        outline,
      }),
    [categories, levels, outline],
  );

  const taskParentBranches = useMemo(() => {
    if (!usesOutlineStorage || outline == null || levels == null) return [];
    if (levels.length <= 1) return [];
    return taskParentBranchesInOutline(outline, levels.length);
  }, [levels, outline, usesOutlineStorage]);

  const getDocumentTitle = useCallback(() => documentRef.current.title, []);

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
        statuses,
        hierarchyRowOptions,
      ),
    [
      categories,
      collapsed,
      filters,
      hierarchyRowOptions,
      lineageIds,
      memberMap,
      rowHeight,
      statuses,
      today,
    ],
  );

  const displayOutline = useMemo(() => {
    if (!usesOutlineStorage || outline == null || reorderPreview?.kind !== "task") {
      return outline;
    }
    const levelCount = hierarchyLayout.levelCount;
    const owner = findOutlineTaskOwner(
      outline,
      reorderPreview.taskId,
      levelCount,
    );
    if (owner == null) return outline;
    if (
      levelCount === 1 ||
      owner.parentBranchId === reorderPreview.targetGroupId
    ) {
      return reorderTaskInOutlineParent(
        outline,
        reorderPreview.taskId,
        reorderPreview.insertIndex,
        levelCount,
      );
    }
    if (!hierarchyLayout.aligned) return outline;
    return moveTaskToOutlineParent(
      outline,
      reorderPreview.taskId,
      reorderPreview.targetGroupId,
      reorderPreview.insertIndex,
      levelCount,
    );
  }, [
    hierarchyLayout.aligned,
    hierarchyLayout.levelCount,
    outline,
    reorderPreview,
    usesOutlineStorage,
  ]);

  const displayCategories = useMemo(() => {
    if (reorderPreview == null) return categories;
    if (reorderPreview.kind === "task") {
      if (usesOutlineStorage) return categories;
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
  }, [categories, reorderPreview, usesOutlineStorage]);

  const hierarchyRowOptionsForDisplay = useMemo(
    () => ({
      levels: levels ?? null,
      outline: displayOutline,
      useLegacyCategoryRows: hierarchyLayout.useLegacyCategoryRows,
      levelCount: hierarchyLayout.levelCount,
    }),
    [displayOutline, hierarchyLayout, levels],
  );

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
        statuses,
        hierarchyRowOptionsForDisplay,
      ),
    [
      collapsed,
      displayCategories,
      filters,
      hierarchyRowOptionsForDisplay,
      lineageIds,
      memberMap,
      rowHeight,
      statuses,
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
      setReorderPreview(null);
      if (usesOutlineStorage && outline != null) {
        const levelCount = hierarchyLayout.levelCount;
        const owner = findOutlineTaskOwner(outline, taskId, levelCount);
        if (owner == null) return;
        const sameParent =
          levelCount === 1 ||
          owner.parentBranchId === targetGroupId;
        if (sameParent) {
          const currentIndex = tasksInOutlineParent(
            outline,
            owner.parentBranchId,
            levelCount,
          ).findIndex((task) => task.id === taskId);
          if (currentIndex === insertIndex) return;
          commitDocument((current) => ({
            ...current,
            outline: reorderTaskInOutlineParent(
              current.outline ?? [],
              taskId,
              insertIndex,
              levelCount,
            ),
          }));
          return;
        }
        if (!hierarchyLayout.aligned) return;
        const next = moveTaskToOutlineParent(
          outline,
          taskId,
          targetGroupId,
          insertIndex,
          levelCount,
        );
        commitDocument((current) => ({ ...current, outline: next }));
        return;
      }
      const owner = findTaskOwner(categories, taskId);
      if (owner == null) return;
      if (owner.groupId === targetGroupId) {
        const currentIndex = taskIndexInGroup(categories, taskId);
        if (currentIndex == null || currentIndex === insertIndex) return;
        commitCategories((prev) =>
          reorderTaskInGroup(prev, taskId, insertIndex),
        );
        return;
      }
      if (!hierarchyLayout.aligned) return;
      const next = moveTaskToGroup(
        categories,
        taskId,
        targetGroupId,
        insertIndex,
      );
      if (next === categories) return;
      commitCategories(() => next);
    },
    [
      blockDocumentEditsRef,
      categories,
      commitCategories,
      commitDocument,
      hierarchyLayout.aligned,
      hierarchyLayout.levelCount,
      outline,
      setReorderPreview,
      usesOutlineStorage,
    ],
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
    if (!statusCatalogSettled) return;
    if (
      filters.status === "all" ||
      filters.status === "not-done" ||
      statuses.some((item) => item.id === filters.status)
    ) {
      return;
    }
    setFilters((prev) => ({ ...prev, status: "all" }));
  }, [filters.status, statusCatalogSettled, statuses]);

  useEffect(() => {
    if (!memberCatalogSettled) return;
    if (
      filters.assignee === "all" ||
      filters.assignee === UNASSIGNED_FILTER ||
      knownMemberIds.has(filters.assignee)
    ) {
      return;
    }
    setFilters((prev) => ({ ...prev, assignee: "all" }));
  }, [filters.assignee, knownMemberIds, memberCatalogSettled]);

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

  const scheduleTags = useMemo(
    () => collectTagsInDocumentOrder(categories),
    [categories],
  );
  useEffect(() => {
    const pruned = pruneSelectedTags(filters.tags, scheduleTags);
    if (
      pruned.length === filters.tags.length &&
      pruned.every((tag, index) => tag === filters.tags[index])
    ) {
      return;
    }
    setFilters((prev) => ({ ...prev, tags: pruned }));
  }, [filters.tags, scheduleTags]);

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
    setTaskSelection(emptyTaskSelection());
  }, []);

  const selectTask = useCallback((id: ScheduleId | null) => {
    setTaskSelection(id == null ? emptyTaskSelection() : singleTaskSelection(id));
  }, []);

  const selectTaskWithClick = useCallback(
    (
      id: ScheduleId,
      mod: TaskClickModifiers,
      visibleIds: ScheduleId[],
      commandKey: boolean,
    ) => {
      setTaskSelection((prev) =>
        selectTaskClick(visibleIds, prev, id, mod, commandKey),
      );
    },
    [],
  );

  const selectTaskFromContextMenu = useCallback((id: ScheduleId) => {
    setTaskSelection((prev) => selectTaskContextMenu(prev, id));
  }, []);

  const navigateTaskSelection = useCallback(
    (
      rows: VisibleRow[],
      direction: "prev" | "next",
      extend: boolean,
      onAfter?: (next: TaskSelectionState) => void,
    ) => {
      setTaskSelection((prev) => {
        const next = extend
          ? extendSelectionByArrow(rows, prev, direction)
          : moveSelectionByArrow(rows, prev, direction);
        onAfter?.(next);
        return next;
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setTaskSelection(emptyTaskSelection());
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
      if (usesOutlineStorage) {
        commitDocument((current) => ({
          ...current,
          outline: mapAllTasksInOutline(current.outline ?? [], (task) => {
            if (task.id !== taskId) return task;
            return {
              ...task,
              start: isoDate(addDays(parseDate(task.start), deltaDays)),
              end: isoDate(addDays(parseDate(task.end), deltaDays)),
            };
          }),
        }));
        return;
      }
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
    [commitCategories, commitDocument, usesOutlineStorage],
  );

  const moveSelectedTasksByDays = useCallback(
    (taskIds: readonly ScheduleId[], deltaDays: number) => {
      if (deltaDays === 0 || taskIds.length === 0) return;
      const idSet = new Set(taskIds);
      if (usesOutlineStorage) {
        commitDocument((current) => ({
          ...current,
          outline: mapAllTasksInOutline(current.outline ?? [], (task) => {
            if (!idSet.has(task.id)) return task;
            return {
              ...task,
              start: isoDate(addDays(parseDate(task.start), deltaDays)),
              end: isoDate(addDays(parseDate(task.end), deltaDays)),
            };
          }),
        }));
        return;
      }
      commitCategories((prev) =>
        mapTasks(prev, (task) => {
          if (!idSet.has(task.id)) return task;
          return {
            ...task,
            start: isoDate(addDays(parseDate(task.start), deltaDays)),
            end: isoDate(addDays(parseDate(task.end), deltaDays)),
          };
        }),
      );
    },
    [commitCategories, commitDocument, usesOutlineStorage],
  );

  const setTaskStart = useCallback(
    (taskId: ScheduleId, start: string) => {
      if (usesOutlineStorage) {
        commitDocument((current) => ({
          ...current,
          outline: mapAllTasksInOutline(current.outline ?? [], (task) => {
            if (task.id !== taskId) return task;
            const end = start > task.end ? start : task.end;
            return { ...task, start, end };
          }),
        }));
        return;
      }
      commitCategories((prev) =>
        mapTasks(prev, (task) => {
          if (task.id !== taskId) return task;
          const end = start > task.end ? start : task.end;
          return { ...task, start, end };
        }),
      );
    },
    [commitCategories, commitDocument, usesOutlineStorage],
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
    (patch: {
      name: string;
      date: string;
      confidence: Milestone["confidence"];
      groupId: ScheduleId;
    }) => {
      if (!patch.date || editingMilestoneId == null) return false;
      const current = documentRef.current;
      const before = current.milestones.find(
        (milestone) => milestone.id === editingMilestoneId,
      );
      if (before == null) return false;
      const nextMilestones = applyMilestoneEdit(
        current.milestones,
        editingMilestoneId,
        current.milestoneGroups,
        patch,
      );
      const after = nextMilestones.find(
        (milestone) => milestone.id === editingMilestoneId,
      );
      if (after == null) return false;
      commitMilestones(() => nextMilestones);
      if (
        before.groupId !== after.groupId &&
        hiddenMilestoneGroupIds.includes(after.groupId)
      ) {
        setHiddenMilestoneGroupIds((prev) =>
          prev.filter((id) => id !== after.groupId),
        );
      }
      setEditingMilestoneId(null);
      return true;
    },
    [commitMilestones, editingMilestoneId, hiddenMilestoneGroupIds],
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
      const taken = collectScheduleIds(
        current.categories,
        current.milestoneGroups,
        current.milestones,
      );
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
      const update = (task: Task) => {
        if (task.id !== taskId) return task;
        const next = end < task.start ? task.start : end;
        return { ...task, end: next };
      };
      if (usesOutlineStorage) {
        commitDocument((current) => ({
          ...current,
          outline: mapAllTasksInOutline(current.outline ?? [], update),
        }));
        return;
      }
      commitCategories((prev) => mapTasks(prev, update));
    },
    [commitCategories, commitDocument, usesOutlineStorage],
  );

  const shiftTaskEndByDays = useCallback(
    (taskId: ScheduleId, deltaDays: number) => {
      if (deltaDays === 0) return;
      const update = (task: Task) => {
        if (task.id !== taskId) return task;
        const end = isoDate(addDays(parseDate(task.end), deltaDays));
        const next = end < task.start ? task.start : end;
        return { ...task, end: next };
      };
      if (usesOutlineStorage) {
        commitDocument((current) => ({
          ...current,
          outline: mapAllTasksInOutline(current.outline ?? [], update),
        }));
        return;
      }
      commitCategories((prev) => mapTasks(prev, update));
    },
    [commitCategories, commitDocument, usesOutlineStorage],
  );

  const openEditDialog = useCallback(
    (task: Task) => {
      setDuplicatingTaskId(null);
      selectTask(task.id);
    },
    [selectTask],
  );

  const openDuplicateDialog = useCallback((taskId: ScheduleId) => {
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
      const update = (task: Task) =>
        task.id === taskId ? { ...task, confidence } : task;
      if (usesOutlineStorage) {
        commitDocument((current) => ({
          ...current,
          outline: mapAllTasksInOutline(current.outline ?? [], update),
        }));
        return;
      }
      commitCategories((prev) => mapTasks(prev, update));
    },
    [commitCategories, commitDocument, usesOutlineStorage],
  );

  const saveTaskNote = useCallback(
    (taskId: ScheduleId, rawNote: string) => {
      const update = (task: Task) =>
        task.id === taskId ? applyTaskNote(task, rawNote) : task;
      if (usesOutlineStorage) {
        commitDocument((current) => ({
          ...current,
          outline: mapAllTasksInOutline(current.outline ?? [], update),
        }));
        return;
      }
      commitCategories((prev) => mapTasks(prev, update));
    },
    [commitCategories, commitDocument, usesOutlineStorage],
  );

  const applyTaskPatch = useCallback(
    (taskId: ScheduleId, patch: TaskEditPatch): string | null => {
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
      const current = documentRef.current;
      if (usesOutlineStorage && current.outline != null) {
        const result = outlineAfterTaskEdit(
          current.outline,
          current.milestones,
          title,
          taskId,
          { ...patch, progress: roundedProgress },
        );
        if (!result.ok) return result.message;
        commitDocument((doc) => ({ ...doc, outline: result.outline }));
        return null;
      }
      const result = categoriesAfterTaskEdit(
        current.categories,
        current.milestones,
        title,
        taskId,
        { ...patch, progress: roundedProgress },
      );
      if (!result.ok) return result.message;
      commitCategories(() => result.categories);
      return null;
    },
    [commitCategories, commitDocument, title, usesOutlineStorage],
  );

  const applyBulkTaskDraft = useCallback(
    (taskIds: readonly ScheduleId[], draft: BulkTaskDraft): string | null => {
      const result = applyBulkTaskEdit(
        documentRef.current.categories,
        documentRef.current.milestones,
        title,
        taskIds,
        draft,
      );
      if (!result.ok) return result.message;
      commitCategories(() => result.categories);
      return null;
    },
    [commitCategories, title],
  );

  const appendTaskTag = useCallback(
    (taskId: ScheduleId, rawTag: string): string | null => {
      let duplicate = false;
      commitCategories((prev) => {
        const result = addTaskTag(prev, taskId, rawTag);
        duplicate = result.duplicate;
        return result.categories;
      });
      if (duplicate) return "このタスクには、同じタグが付いています。";
      return null;
    },
    [commitCategories],
  );

  const dropTaskTag = useCallback(
    (taskId: ScheduleId, tag: string) => {
      commitCategories((prev) => removeTaskTag(prev, taskId, tag));
    },
    [commitCategories],
  );

  const addMilestone = useCallback(
    (input: {
      name: string;
      date: string;
      confidence: Milestone["confidence"];
      groupId: ScheduleId | null;
    }): string | null => {
      const message = validateNewMilestone(input);
      if (message) return message;
      const id = uniqueScheduleId(
        collectScheduleIds(
          documentRef.current.categories,
          documentRef.current.milestoneGroups,
          documentRef.current.milestones,
        ),
      );
      commitDocument((current) => {
        const taken = collectScheduleIds(
          current.categories,
          current.milestoneGroups,
          current.milestones,
        );
        taken.add(id);
        const ensured = ensureMilestoneGroupForAdd(
          current.milestoneGroups,
          taken,
          () => uniqueScheduleId(taken),
          input.groupId,
        );
        const milestone: Milestone = {
          id,
          name: input.name.trim(),
          date: input.date,
          confidence: input.confidence,
          groupId: ensured.groupId,
        };
        return {
          ...current,
          milestoneGroups: ensured.milestoneGroups,
          milestones: appendMilestone(current.milestones, milestone),
        };
      });
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
      parentBranchId?: ScheduleId;
    }) => {
      const current = documentRef.current;
      const currentCategories = current.categories;
      if (
        usesOutlineStorage &&
        current.outline != null &&
        current.levels != null
      ) {
        const levelCount = current.levels.length;
        const parentBranchId =
          levelCount === 1 ? null : input.parentBranchId ?? null;
        if (levelCount > 1 && parentBranchId == null) return null;
        if (!input.name.trim()) return null;
        const taken = collectScheduleIds(
          currentCategories,
          current.milestoneGroups,
          current.milestones,
        );
        for (const outlineId of collectOutlineIds(current.outline)) {
          taken.add(outlineId);
        }
        const name = input.name.trim();
        const id = uniqueScheduleId(taken);
        const task: Task = {
          id,
          name,
          start: input.start,
          end: input.end,
          assigneeId: null,
          status: defaultStatusId(statuses),
          progress: 0,
          confidence: "tentative",
          predecessors: [],
          milestoneId: null,
        };
        commitDocument((doc) => ({
          ...doc,
          outline: insertTaskInOutline(
            doc.outline ?? [],
            task,
            parentBranchId,
            levelCount,
          ),
        }));
        setFilters((prev) =>
          relaxFiltersForNewTask(prev, task, today, memberMap, undefined, statuses),
        );
        setLineageTaskId(null);
        setTaskSelection(singleTaskSelection(id));
        setDuplicatingTaskId(null);
        return id;
      }
      if (validateNewTask(input, currentCategories)) return null;
      const name = input.name.trim();
      const id = uniqueScheduleId(
        collectScheduleIds(
          currentCategories,
          current.milestoneGroups,
          current.milestones,
        ),
      );
      const task: Task = {
        id,
        name,
        start: input.start,
        end: input.end,
        assigneeId: null,
        status: defaultStatusId(statuses),
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
        relaxFiltersForNewTask(prev, task, today, memberMap, undefined, statuses),
      );
      setLineageTaskId(null);
      setTaskSelection(singleTaskSelection(id));
      setDuplicatingTaskId(null);
      return id;
    },
    [commitCategories, commitDocument, memberMap, statuses, today, usesOutlineStorage],
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
        collectScheduleIds(
          current.categories,
          current.milestoneGroups,
          current.milestones,
        ),
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
            statuses,
          ),
        );
      }
      setLineageTaskId(null);
      setTaskSelection(singleTaskSelection(id));
      setDuplicatingTaskId(null);
      return { ok: true, id };
    },
    [commitCategories, duplicatingTaskId, memberMap, statuses, title, today],
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
      if (usesOutlineStorage) {
        commitDocument((current) => ({
          ...current,
          outline: removeTaskFromOutline(current.outline ?? [], taskId),
        }));
      } else {
        commitCategories((prev) => removeTask(prev, taskId));
      }
      const deleted = new Set<ScheduleId>([taskId]);
      setTaskSelection((current) =>
        removeDeletedTasksFromSelection(current, deleted),
      );
      setDuplicatingTaskId((current) => (current === taskId ? null : current));
      setEditingNoteTaskId((current) => (current === taskId ? null : current));
      setLineageTaskId((current) => (current === taskId ? null : current));
    },
    [commitCategories, commitDocument, usesOutlineStorage],
  );

  const deleteTasks = useCallback(
    (taskIds: readonly ScheduleId[]) => {
      if (taskIds.length === 0) return;
      const deleted = new Set(taskIds);
      if (usesOutlineStorage) {
        commitDocument((current) => {
          let nextOutline = current.outline ?? [];
          for (const taskId of taskIds) {
            nextOutline = removeTaskFromOutline(nextOutline, taskId);
          }
          return { ...current, outline: nextOutline };
        });
      } else {
        commitCategories((prev) => {
          let next = prev;
          for (const taskId of taskIds) {
            next = removeTask(next, taskId);
          }
          return next;
        });
      }
      setTaskSelection((current) =>
        removeDeletedTasksFromSelection(current, deleted),
      );
      setDuplicatingTaskId((current) =>
        current != null && deleted.has(current) ? null : current,
      );
      setEditingNoteTaskId((current) =>
        current != null && deleted.has(current) ? null : current,
      );
      setLineageTaskId((current) =>
        current != null && deleted.has(current) ? null : current,
      );
    },
    [commitCategories, commitDocument, usesOutlineStorage],
  );

  const snapshotCanonicalJson = useCallback((snap: DocumentSnapshot) => {
    return serializeScheduleDocument(
      snap.title,
      snap.categories,
      snap.milestoneGroups,
      snap.milestones,
      snap.levels,
      snap.outline,
    );
  }, []);

  const replaceScheduleDocument = useCallback(
    (document: ScheduleDocument): ReplaceScheduleDocumentResult => {
      const current = documentRef.current;
      const currentJson = snapshotCanonicalJson(current);
      if (blockDocumentEditsRef?.current) {
        return { outcome: "rejected" };
      }
      const next = snapshotFromDocument(document);
      const pushed = pushDocumentHistory(historyRef.current, current, next);
      if (!pushed) {
        return { outcome: "unchanged", screenJson: currentJson };
      }
      historyRef.current = pushed.history;
      syncHistoryUi();
      if (!pushed.applied) {
        return { outcome: "unchanged", screenJson: currentJson };
      }
      documentRef.current = pushed.applied;
      setTitle(pushed.applied.title);
      setCategories(pushed.applied.categories);
      setMilestoneGroups(pushed.applied.milestoneGroups);
      setMilestones(pushed.applied.milestones);
      setLevels(pushed.applied.levels);
      setOutline(pushed.applied.outline);
      pruneUiForDocument(pushed.applied);
      return {
        outcome: "applied",
        screenJson: snapshotCanonicalJson(pushed.applied),
      };
    },
    [
      blockDocumentEditsRef,
      pruneUiForDocument,
      snapshotCanonicalJson,
      syncHistoryUi,
    ],
  );

  const applyMergedDocument = useCallback(
    (
      document: ScheduleDocument,
    ): { before: DocumentSnapshot; after: DocumentSnapshot } | null => {
      if (blockDocumentEditsRef?.current) return null;
      const before = documentRef.current;
      const next = snapshotFromDocument(document);
      const pushed = pushDocumentHistory(historyRef.current, before, next);
      if (!pushed) return null;
      historyRef.current = pushed.history;
      syncHistoryUi();
      if (!pushed.applied) return null;
      documentRef.current = pushed.applied;
      setTitle(pushed.applied.title);
      setCategories(pushed.applied.categories);
      setMilestoneGroups(pushed.applied.milestoneGroups);
      setMilestones(pushed.applied.milestones);
      setLevels(pushed.applied.levels);
      setOutline(pushed.applied.outline);
      setTaskSelection((current) =>
        pruneTaskSelection(pushed.applied!.categories, current),
      );
      setDuplicatingTaskId(null);
      setEditingNoteTaskId(null);
      setEditingMilestoneId(null);
      setEditingHierarchy(null);
      setAddingHierarchy(null);
      setDeletingHierarchy(null);
      setReorderPreview(null);
      pruneUiForDocument(pushed.applied);
      return { before, after: pushed.applied };
    },
    [
      blockDocumentEditsRef,
      pruneUiForDocument,
      setReorderPreview,
      syncHistoryUi,
    ],
  );

  const replaceDocument = useCallback(
    (document: ScheduleDocument) => {
      historyRef.current = createDocumentHistory();
      const snapshot = snapshotFromDocument(document);
      documentRef.current = snapshot;
      setTitle(document.title);
      setCategories(snapshot.categories);
      setMilestoneGroups(snapshot.milestoneGroups);
      setMilestones(snapshot.milestones);
      setLevels(snapshot.levels);
      setOutline(snapshot.outline);
      setHiddenMilestoneGroupIds([]);
      setTaskSelection(emptyTaskSelection());
      setLineageTaskId(null);
      setDuplicatingTaskId(null);
      setEditingNoteTaskId(null);
      setEditingMilestoneId(null);
      setCollapsed(new Set());
      const defaultView = defaultScheduleFilterViewState();
      setFilters(defaultView.filters);
      setSearchField(defaultView.searchField);
      setHiddenMilestoneGroupIds(defaultView.hiddenMilestoneGroupIds);
      setReorderPreview(null);
      syncHistoryUi();
    },
    [setReorderPreview, syncHistoryUi],
  );

  const reloadDocumentFromDisk = useCallback(
    (document: ScheduleDocument) => {
      historyRef.current = createDocumentHistory();
      const snapshot = snapshotFromDocument(document);
      documentRef.current = snapshot;
      setTitle(document.title);
      setCategories(snapshot.categories);
      setMilestoneGroups(snapshot.milestoneGroups);
      setMilestones(snapshot.milestones);
      setLevels(snapshot.levels);
      setOutline(snapshot.outline);
      setHiddenMilestoneGroupIds((hidden) =>
        hidden.filter((groupId) =>
          snapshot.milestoneGroups.some((group) => group.id === groupId),
        ),
      );
      setDiskEpoch((epoch) => epoch + 1);
      setReorderPreview(null);
      pruneUiForDocument(snapshot);
      syncHistoryUi();
    },
    [pruneUiForDocument, setReorderPreview, syncHistoryUi],
  );

  const undo = useCallback(() => {
    if (blockDocumentEditsRef?.current) return;
    const result = undoDocumentHistory(historyRef.current, documentRef.current);
    if (!result) return;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
    syncHistoryUi();
    onHistoryUndoApplied?.(result.snapshot);
  }, [
    applySnapshot,
    blockDocumentEditsRef,
    onHistoryUndoApplied,
    syncHistoryUi,
  ]);

  const redo = useCallback(() => {
    if (blockDocumentEditsRef?.current) return;
    const result = redoDocumentHistory(historyRef.current, documentRef.current);
    if (!result) return;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
    syncHistoryUi();
    onHistoryRedoApplied?.(result.snapshot);
  }, [
    applySnapshot,
    blockDocumentEditsRef,
    onHistoryRedoApplied,
    syncHistoryUi,
  ]);

  const duplicatingTask = useMemo(
    () => findTaskInDocument(categories, outline, duplicatingTaskId),
    [categories, duplicatingTaskId],
  );

  const editingNoteTask = useMemo(
    () => findTaskInDocument(categories, outline, editingNoteTaskId),
    [categories, editingNoteTaskId],
  );

  const lineageTask = useMemo(
    () => findTaskInDocument(categories, outline, lineageTaskId),
    [categories, lineageTaskId],
  );

  const prunedHiddenMilestoneGroupIds = useMemo(
    () => pruneHiddenMilestoneGroupIds(hiddenMilestoneGroupIds, milestoneGroups),
    [hiddenMilestoneGroupIds, milestoneGroups],
  );

  const setFilterViewState = useCallback((state: ScheduleFilterViewState) => {
    setFilters({
      ...state.filters,
      tags: [...state.filters.tags],
    });
    setSearchField(state.searchField);
    setHiddenMilestoneGroupIds([...state.hiddenMilestoneGroupIds]);
    setCollapsed(
      collapsedSetFromIds(
        state.collapsedCategoryIds,
        state.collapsedGroupIds,
      ),
    );
  }, []);

  const getFilterViewState = useCallback((): ScheduleFilterViewState => {
    const { collapsedCategoryIds, collapsedGroupIds } =
      collapsedIdsFromSet(collapsed);
    return {
      filters,
      searchField,
      hiddenMilestoneGroupIds: prunedHiddenMilestoneGroupIds,
      collapsedCategoryIds,
      collapsedGroupIds,
    };
  }, [collapsed, filters, prunedHiddenMilestoneGroupIds, searchField]);

  useEffect(() => {
    if (prunedHiddenMilestoneGroupIds.length === hiddenMilestoneGroupIds.length) {
      return;
    }
    setHiddenMilestoneGroupIds(prunedHiddenMilestoneGroupIds);
  }, [hiddenMilestoneGroupIds, prunedHiddenMilestoneGroupIds]);

  const hiddenMilestoneGroupIdSet = useMemo(
    () => new Set(prunedHiddenMilestoneGroupIds),
    [prunedHiddenMilestoneGroupIds],
  );

  const visibleMilestoneGroupIds = useMemo(
    () =>
      new Set(
        milestoneGroups
          .filter((group) => !hiddenMilestoneGroupIdSet.has(group.id))
          .map((group) => group.id),
      ),
    [hiddenMilestoneGroupIdSet, milestoneGroups],
  );

  const setMilestoneGroupVisible = useCallback(
    (groupId: ScheduleId, visible: boolean) => {
      setHiddenMilestoneGroupIds((prev) => {
        const hidden = prev.includes(groupId);
        if (visible && hidden) return prev.filter((id) => id !== groupId);
        if (!visible && !hidden) return [...prev, groupId];
        return prev;
      });
    },
    [],
  );

  const showAllMilestoneGroups = useCallback(() => {
    setHiddenMilestoneGroupIds([]);
  }, []);

  const showOnlyMilestoneGroup = useCallback(
    (groupId: ScheduleId) => {
      setHiddenMilestoneGroupIds(
        hiddenMilestoneGroupIdsForShowOnly(groupId, milestoneGroups),
      );
    },
    [milestoneGroups],
  );

  return {
    title,
    categories,
    milestoneGroups,
    visibleMilestoneGroupIds,
    hiddenMilestoneGroupIds: prunedHiddenMilestoneGroupIds,
    setMilestoneGroupVisible,
    showAllMilestoneGroups,
    showOnlyMilestoneGroup,
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
    searchField,
    setSearchField,
    setFilterViewState,
    getFilterViewState,
    knownMemberIds,
    updateFilters,
    taskSelection,
    selectedTaskIds,
    selectedTaskId,
    selectTask,
    selectTaskWithClick,
    selectTaskFromContextMenu,
    navigateTaskSelection,
    clearSelection,
    lineageTask,
    lineageTaskId,
    lineageIds,
    toggleLineage,
    showLineage,
    clearLineage,
    moveTaskByDays,
    moveSelectedTasksByDays,
    setTaskStart,
    setTaskEnd,
    shiftTaskEndByDays,
    openEditDialog,
    openDuplicateDialog,
    closeDuplicateDialog,
    duplicatingTask,
    applyTaskPatch,
    applyBulkTaskDraft,
    appendTaskTag,
    dropTaskTag,
    scheduleTags,
    duplicateTask,
    setTaskConfidence,
    editingNoteTask,
    openTaskNoteDialog,
    closeTaskNoteDialog,
    saveTaskNote,
    addTask,
    addPredecessorLink,
    removePredecessorLink,
    deleteTask,
    deleteTasks,
    addMilestone,
    deleteMilestone,
    replaceDocument,
    replaceScheduleDocument,
    applyMergedDocument,
    reloadDocumentFromDisk,
    commitTitle,
    getCanonicalJson,
    getDocumentTitle,
    diskEpoch,
    undo,
    redo,
    canUndo: historyUi.canUndo,
    canRedo: historyUi.canRedo,
    today,
    levels,
    outline,
    hierarchyLayout,
    hierarchyLevelBanner,
    usesOutlineStorage,
    taskParentBranches,
    allowCrossParentTaskMove: hierarchyLayout.aligned,
  };
}
