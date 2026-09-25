import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToday } from "./useToday";
import {
  addDays,
  clamp,
  isoDate,
  parseDate,
} from "../model/dates";
import { lineageTaskIds } from "../model/dependencies";
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
import {
  cloneCategories,
  createScheduleId,
  insertTask,
  mapTasks,
  removeTask,
  validateNewTask,
  validateTaskEdit,
} from "../model/tasks";
import { isOverdue } from "../model/timeline";
import type { Member, MemberId } from "../model/memberTypes";
import {
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
  const [selectedTaskId, setSelectedTaskId] = useState<ScheduleId | null>(null);
  const [lineageTaskId, setLineageTaskId] = useState<ScheduleId | null>(null);
  const [filters, setFilters] = useState<ScheduleFilters>({
    assignee: "all",
    status: "all",
    overdue: "all",
    relation: "all",
    search: "",
  });
  const [editingTaskId, setEditingTaskId] = useState<ScheduleId | null>(null);
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
    (patch: { name: string; date: string }) => {
      if (!patch.date || editingMilestoneId == null) return false;
      commitMilestones((prev) =>
        prev.map((milestone) =>
          milestone.id === editingMilestoneId
            ? {
                ...milestone,
                name: patch.name.trim() || milestone.name,
                date: patch.date,
              }
            : milestone,
        ),
      );
      setEditingMilestoneId(null);
      return true;
    },
    [commitMilestones, editingMilestoneId],
  );

  const editingMilestone = useMemo(
    () => milestones.find((milestone) => milestone.id === editingMilestoneId) ?? null,
    [editingMilestoneId, milestones],
  );

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

  const saveTaskEdit = useCallback(
    (patch: {
      name: string;
      start: string;
      end: string;
      assigneeId: MemberId | null;
      status: Task["status"];
      progress: number;
      predecessors: ScheduleId[];
      successors: ScheduleId[];
      milestoneId: ScheduleId | null;
    }) => {
      if (editingTaskId == null) return false;
      const roundedProgress = Math.round(patch.progress);
      if (
        validateTaskEdit({
          name: patch.name,
          start: patch.start,
          end: patch.end,
          progress: roundedProgress,
        })
      ) {
        return false;
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
      commitCategories((prev) =>
        mapTasks(prev, (task) => {
          if (task.id === editingTaskId) {
            return {
              ...task,
              name: patch.name.trim(),
              start: patch.start,
              end: patch.end,
              assigneeId: patch.assigneeId,
              status: patch.status,
              progress: clamp(roundedProgress, 0, 100),
              predecessors,
              milestoneId:
                patch.milestoneId != null && milestoneIds.has(patch.milestoneId)
                  ? patch.milestoneId
                  : null,
            };
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
        }),
      );
      setEditingTaskId(null);
      return true;
    },
    [commitCategories, editingTaskId],
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
      const id = createScheduleId();
      const task: Task = {
        id,
        name,
        start: input.start,
        end: input.end,
        assigneeId: null,
        status: "not-started",
        progress: 0,
        predecessors: [],
        milestoneId: null,
      };
      const place = { category: input.category, group: input.group };
      commitCategories((prev) => insertTask(prev, task, place));
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(categoryCollapseKey(place.category));
        next.delete(groupCollapseKey(place.category, place.group));
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
        search: prev.search && !name.includes(prev.search) ? "" : prev.search,
      }));
      setLineageTaskId(null);
      setSelectedTaskId(id);
      setEditingTaskId(null);
      return id;
    },
    [commitCategories, today],
  );

  const deleteTask = useCallback(
    (taskId: ScheduleId) => {
      commitCategories((prev) => removeTask(prev, taskId));
      setSelectedTaskId((current) => (current === taskId ? null : current));
      setEditingTaskId((current) => (current === taskId ? null : current));
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
      setEditingMilestoneId(null);
      setCollapsed(new Set());
      setFilters({
        assignee: "all",
        status: "all",
        overdue: "all",
        relation: "all",
        search: "",
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

  const lineageTask = useMemo(
    () => findTaskById(categories, lineageTaskId),
    [categories, lineageTaskId],
  );

  return {
    title,
    categories,
    milestones,
    editingMilestone,
    moveMilestoneByDays,
    openMilestoneEdit,
    closeMilestoneEdit,
    saveMilestoneEdit,
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
    moveTaskByDays,
    setTaskStart,
    setTaskEnd,
    openEditDialog,
    closeEditDialog,
    saveTaskEdit,
    editingTask,
    addTask,
    deleteTask,
    replaceDocument,
    reloadDocumentFromDisk,
    diskEpoch,
    undo,
    redo,
    today,
  };
}
