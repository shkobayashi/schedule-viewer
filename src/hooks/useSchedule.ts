import { useCallback, useMemo, useState } from "react";
import {
  addDays,
  clamp,
  isoDate,
  parseDate,
} from "../model/dates";
import { lineageTaskIds } from "../model/dependencies";
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
} from "../model/tasks";
import { isOverdue, TODAY_ISO } from "../model/timeline";
import {
  UNASSIGNED_FILTER,
  type Category,
  type Milestone,
  type ScheduleFilters,
  type ScheduleId,
  type Task,
} from "../model/types";
import { collectAssignees } from "../sample/schedule";

export function useSchedule(
  initialTitle: string,
  initialCategories: Category[],
  initialMilestones: Milestone[],
  rowHeight: number,
  bodyHeight: number,
) {
  const [title] = useState(() => initialTitle);
  const [categories, setCategories] = useState(() =>
    cloneCategories(initialCategories),
  );
  const [milestones, setMilestones] = useState(() =>
    initialMilestones.map((milestone) => ({ ...milestone })),
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

  const assignees = useMemo(
    () => collectAssignees(categories),
    [categories],
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
      computeVisibleRows(categories, filters, collapsed, rowHeight, lineageIds),
    [categories, collapsed, filters, lineageIds, rowHeight],
  );

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

  const moveTaskByDays = useCallback((taskId: ScheduleId, deltaDays: number) => {
    if (deltaDays === 0) return;
    setCategories((prev) =>
      mapTasks(prev, (task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          start: isoDate(addDays(parseDate(task.start), deltaDays)),
          end: isoDate(addDays(parseDate(task.end), deltaDays)),
        };
      }),
    );
  }, []);

  const setTaskStart = useCallback((taskId: ScheduleId, start: string) => {
    setCategories((prev) =>
      mapTasks(prev, (task) => {
        if (task.id !== taskId) return task;
        const end =
          start < task.end
            ? task.end
            : isoDate(addDays(parseDate(start), 1));
        return { ...task, start, end };
      }),
    );
  }, []);

  const moveMilestoneByDays = useCallback((id: ScheduleId, deltaDays: number) => {
    if (deltaDays === 0) return;
    setMilestones((prev) =>
      prev.map((milestone) =>
        milestone.id === id
          ? {
              ...milestone,
              date: isoDate(addDays(parseDate(milestone.date), deltaDays)),
            }
          : milestone,
      ),
    );
  }, []);

  const openMilestoneEdit = useCallback((id: ScheduleId) => {
    setEditingMilestoneId(id);
  }, []);

  const closeMilestoneEdit = useCallback(() => {
    setEditingMilestoneId(null);
  }, []);

  const saveMilestoneEdit = useCallback(
    (patch: { name: string; date: string }) => {
      if (!patch.date || editingMilestoneId == null) return false;
      setMilestones((prev) =>
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
    [editingMilestoneId],
  );

  const editingMilestone = useMemo(
    () => milestones.find((milestone) => milestone.id === editingMilestoneId) ?? null,
    [editingMilestoneId, milestones],
  );

  const setTaskEnd = useCallback((taskId: ScheduleId, end: string) => {
    setCategories((prev) =>
      mapTasks(prev, (task) => {
        if (task.id !== taskId) return task;
        const next =
          end > task.start
            ? end
            : isoDate(addDays(parseDate(task.start), 1));
        return { ...task, end: next };
      }),
    );
  }, []);

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
      assignee: string;
      status: Task["status"];
      progress: number;
      predecessors: ScheduleId[];
      successors: ScheduleId[];
      milestoneId: ScheduleId | null;
    }) => {
      if (patch.end <= patch.start) return false;
      if (editingTaskId == null) return false;
      const predecessors = [
        ...new Set(
          patch.predecessors.filter((id) => id !== editingTaskId),
        ),
      ];
      const successors = new Set(
        patch.successors.filter((id) => id !== editingTaskId),
      );
      setCategories((prev) =>
        mapTasks(prev, (task) => {
          if (task.id === editingTaskId) {
            return {
              ...task,
              name: patch.name || task.name,
              start: patch.start,
              end: patch.end,
              assignee: patch.assignee.trim(),
              status: patch.status,
              progress: clamp(patch.progress, 0, 100),
              predecessors,
              milestoneId:
                patch.milestoneId != null &&
                milestones.some((milestone) => milestone.id === patch.milestoneId)
                  ? patch.milestoneId
                  : null,
            };
          }
          const withoutSelf = task.predecessors.filter(
            (id) => id !== editingTaskId,
          );
          return {
            ...task,
            predecessors: successors.has(task.id)
              ? [...withoutSelf, editingTaskId]
              : withoutSelf,
          };
        }),
      );
      setEditingTaskId(null);
      return true;
    },
    [editingTaskId, milestones],
  );

  const addTask = useCallback(
    (input: {
      name: string;
      start: string;
      end: string;
      category: string;
      group: string;
    }) => {
      if (validateNewTask(input, categories)) return null;
      const name = input.name.trim();
      const id = createScheduleId();
      const task: Task = {
        id,
        name,
        start: input.start,
        end: input.end,
        assignee: "",
        status: "not-started",
        progress: 0,
        predecessors: [],
        milestoneId: null,
      };
      const place = { category: input.category, group: input.group };
      setCategories(insertTask(categories, task, place));
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
          !isOverdue({ status: "not-started", end: input.end }, TODAY_ISO)
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
    [categories],
  );

  const deleteTask = useCallback((taskId: ScheduleId) => {
    setCategories((prev) => removeTask(prev, taskId));
    setSelectedTaskId((current) => (current === taskId ? null : current));
    setEditingTaskId((current) => (current === taskId ? null : current));
    setLineageTaskId((current) => (current === taskId ? null : current));
  }, []);

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
    assignees,
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
    maxScrollY: Math.max(0, visibleRows.length * rowHeight - bodyHeight),
  };
}
