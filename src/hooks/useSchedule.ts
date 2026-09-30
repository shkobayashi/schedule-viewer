import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToday } from "./useToday";
import {
  addDays,
  clamp,
  isoDate,
  parseDate,
} from "../model/dates";
import {
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
} from "../model/rows";
import { applyTaskNote } from "../model/taskNote";
import {
  appendMilestone,
  milestoneFilterAfterDelete,
  removeMilestone,
  validateNewMilestone,
} from "../model/milestones";
import {
  cloneCategories,
  collectScheduleIds,
  insertTask,
  mapTasks,
  removeTask,
  renameCategory,
  renameGroup,
  uniqueScheduleId,
  validateNewTask,
  validateTaskEdit,
} from "../model/tasks";
import {
  validateDependencyCycles,
  validatePredecessorRefs,
} from "../model/scheduleSemantics";
import { formatValidationErrors } from "../model/validateSchedule";
import { isOverdue } from "../model/timeline";
import type { Member, MemberId } from "../model/memberTypes";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  type Category,
  type Milestone,
  SCHEDULE_SCHEMA_VERSION,
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
  const [editingNoteTaskId, setEditingNoteTaskId] = useState<ScheduleId | null>(
    null,
  );
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
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
      pruneUiForDocument(cloned);
    },
    [pruneUiForDocument],
  );

  const commitDocument = useCallback(
    (buildNext: (current: DocumentSnapshot) => DocumentSnapshot) => {
      const current = documentRef.current;
      const next = buildNext(current);
      const pushed = pushDocumentHistory(historyRef.current, current, next);
      if (!pushed) return;
      historyRef.current = pushed.history;
      documentRef.current = pushed.applied;
      setCategories(pushed.applied.categories);
      setMilestones(pushed.applied.milestones);
    },
    [],
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

  const visibleRows = useMemo(
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
    setEditingTaskId(task.id);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingTaskId(null);
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
    (patch: {
      name: string;
      start: string;
      end: string;
      assigneeId: MemberId | null;
      status: Task["status"];
      progress: number;
      confidence: Task["confidence"];
      predecessors: ScheduleId[];
      successors: ScheduleId[];
      milestoneId: ScheduleId | null;
      note: string;
    }) => {
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
      const predecessors = [
        ...new Set(
          patch.predecessors.filter((id) => id !== editingTaskId),
        ),
      ];
      const successors = new Set(
        patch.successors.filter((id) => id !== editingTaskId),
      );
      const milestoneIds = new Set(
        documentRef.current.milestones.map((milestone) => milestone.id),
      );
      const buildNext = (prev: Category[]) =>
        mapTasks(prev, (task) => {
          if (task.id === editingTaskId) {
            return applyTaskNote(
              {
                ...task,
                name: patch.name.trim(),
                start: patch.start,
                end: patch.end,
                assigneeId: patch.assigneeId,
                status: patch.status,
                progress: clamp(roundedProgress, 0, 100),
                confidence: patch.confidence,
                predecessors,
                milestoneId:
                  patch.milestoneId != null && milestoneIds.has(patch.milestoneId)
                    ? patch.milestoneId
                    : null,
              },
              patch.note,
            );
          }
          const withoutSelf = task.predecessors.filter(
            (id) => id !== editingTaskId,
          );
          if (!successors.has(task.id)) {
            return { ...task, predecessors: withoutSelf };
          }
          const prevIndex = task.predecessors.indexOf(editingTaskId);
          if (prevIndex >= 0) {
            const nextPreds = [...withoutSelf];
            nextPreds.splice(
              Math.min(prevIndex, nextPreds.length),
              0,
              editingTaskId,
            );
            return { ...task, predecessors: nextPreds };
          }
          return {
            ...task,
            predecessors: [...withoutSelf, editingTaskId],
          };
        });

      const nextCategories = buildNext(documentRef.current.categories);
      const candidate: ScheduleDocument = {
        schemaVersion: SCHEDULE_SCHEMA_VERSION,
        title,
        categories: nextCategories,
        milestones: documentRef.current.milestones,
      };
      const semanticIssues = [
        ...validateDependencyCycles(candidate),
        ...validatePredecessorRefs(candidate),
      ];
      if (semanticIssues.length > 0) {
        return formatValidationErrors(semanticIssues);
      }

      commitCategories((prev) => buildNext(prev));
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
      setFilters((prev) => ({
        ...prev,
        assignee:
          prev.assignee !== "all" && prev.assignee !== UNASSIGNED_FILTER
            ? "all"
            : prev.assignee,
        status:
          prev.status === "done" || prev.status === "in-progress"
            ? "all"
            : prev.status,
        overdue:
          prev.overdue === "overdue" &&
          !isOverdue({ status: "not-started", end: input.end }, today)
            ? "all"
            : prev.overdue,
        relation: prev.relation === "broken" ? "all" : prev.relation,
        milestone:
          prev.milestone !== "all" && prev.milestone !== NO_MILESTONE_FILTER
            ? "all"
            : prev.milestone,
        search: prev.search && !name.includes(prev.search) ? "" : prev.search,
        noteSearch: prev.noteSearch.trim() ? "" : prev.noteSearch,
        confidence: prev.confidence === "committed" ? "all" : prev.confidence,
      }));
      setLineageTaskId(null);
      setSelectedTaskId(id);
      setEditingTaskId(null);
      return id;
    },
    [commitCategories, today],
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
    },
    [],
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
      pruneUiForDocument(snapshot);
    },
    [pruneUiForDocument],
  );

  const undo = useCallback(() => {
    const result = undoDocumentHistory(historyRef.current, documentRef.current);
    if (!result) return;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
  }, [applySnapshot]);

  const redo = useCallback(() => {
    const result = redoDocumentHistory(historyRef.current, documentRef.current);
    if (!result) return;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
  }, [applySnapshot]);

  const editingTask = useMemo(
    () => findTaskById(categories, editingTaskId),
    [categories, editingTaskId],
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
    moveMilestoneByDays,
    openMilestoneEdit,
    closeMilestoneEdit,
    saveMilestoneEdit,
    setMilestoneConfidence,
    assigneeFilterOptions,
    visibleRows,
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
    saveTaskEdit,
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
