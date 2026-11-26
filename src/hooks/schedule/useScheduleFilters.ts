import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { StatusItem } from "../../model/statusCatalog";
import {
  applyFieldFilterPatch,
  pruneFieldFilters,
  type FieldFilterCondition,
} from "../../model/fieldFilters";
import {
  hiddenMilestoneGroupIdsForShowOnly,
  hiddenMilestoneIdsForShowOnly,
  pruneHiddenMilestoneGroupIds,
  pruneHiddenMilestoneIds,
} from "../../model/filterChips";
import {
  collapsedIdsFromSet,
  defaultScheduleFilterViewState,
  type ScheduleFilterViewState,
  type SearchField,
} from "../../model/scheduleFilterPersistence";
import { displayedCollapsedSet, resolveExplanationMilestoneBand } from "../../model/explainView";
import type { ExplanationViewState } from "../../model/explainView";
import {
  duplicateMemberNames,
  memberMapFromList,
  memberOptionLabel,
} from "../../model/assigneeDisplay";
import type { Member } from "../../model/memberTypes";
import { collectTagsFromTasks, pruneSelectedTags } from "../../model/taskTags";
import { collectTasksFromDocument } from "../../model/hierarchy";
import {
  NO_MILESTONE_FILTER,
  SCHEDULE_SCHEMA_VERSION,
  UNASSIGNED_FILTER,
  type Category,
  type Milestone,
  type MilestoneGroup,
  type OutlineRoot,
  type ScheduleFieldDef,
  type ScheduleFilters,
  type ScheduleId,
  type ScheduleLevelDef,
} from "../../model/types";
import { emptyTaskSelection } from "../../model/taskSelection";
import { mergeFilterViewCollapsedSet } from "./scheduleFilterViewApply";

export type UseScheduleFiltersParams = {
  title: string;
  categories: Category[];
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
  levels: ScheduleLevelDef[] | undefined;
  outline: OutlineRoot | undefined;
  memberCatalog: Member[] | null;
  memberCatalogSettled: boolean;
  statuses: readonly StatusItem[];
  statusCatalogSettled: boolean;
  effectiveFieldDefs: readonly ScheduleFieldDef[];
  fieldExtensionCatalogSettled: boolean;
  explanationView: ExplanationViewState | null;
  clearExplanationOnHumanViewChange: () => void;
  setTaskSelection: Dispatch<
    SetStateAction<import("../../model/taskSelection").TaskSelectionState>
  >;
};

export function useScheduleFilters({
  title,
  categories,
  milestoneGroups,
  milestones,
  levels,
  outline,
  memberCatalog,
  memberCatalogSettled,
  statuses,
  statusCatalogSettled,
  effectiveFieldDefs,
  fieldExtensionCatalogSettled,
  explanationView,
  clearExplanationOnHumanViewChange,
  setTaskSelection,
}: UseScheduleFiltersParams) {
  const [filters, setFilters] = useState<ScheduleFilters>(
    () => defaultScheduleFilterViewState().filters,
  );
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [hiddenMilestoneGroupIds, setHiddenMilestoneGroupIds] = useState<
    ScheduleId[]
  >([]);
  const [hiddenMilestoneIds, setHiddenMilestoneIds] = useState<ScheduleId[]>(
    [],
  );
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;

  const displayedCollapsed = useMemo(
    () => displayedCollapsedSet(collapsed, explanationView),
    [collapsed, explanationView],
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

  const scheduleTags = useMemo(() => {
    const tasks = collectTasksFromDocument({
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title,
      categories,
      milestoneGroups,
      milestones,
      levels,
      outline,
    });
    return collectTagsFromTasks(tasks);
  }, [categories, levels, milestoneGroups, milestones, outline, title]);

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

  useEffect(() => {
    if (!fieldExtensionCatalogSettled) return;
    const current = filters.fieldFilters ?? {};
    const pruned = pruneFieldFilters(effectiveFieldDefs, current);
    if (pruned === current) return;
    const same =
      Object.keys(pruned).length === Object.keys(current).length &&
      Object.entries(pruned).every(([key, value]) => current[key] === value);
    if (same) return;
    setFilters((prev) => ({ ...prev, fieldFilters: pruned }));
  }, [effectiveFieldDefs, fieldExtensionCatalogSettled, filters.fieldFilters]);

  const prunedHiddenMilestoneGroupIds = useMemo(
    () => pruneHiddenMilestoneGroupIds(hiddenMilestoneGroupIds, milestoneGroups),
    [hiddenMilestoneGroupIds, milestoneGroups],
  );

  const prunedHiddenMilestoneIds = useMemo(
    () => pruneHiddenMilestoneIds(hiddenMilestoneIds, milestones),
    [hiddenMilestoneIds, milestones],
  );

  useEffect(() => {
    if (prunedHiddenMilestoneGroupIds.length === hiddenMilestoneGroupIds.length) {
      return;
    }
    setHiddenMilestoneGroupIds(prunedHiddenMilestoneGroupIds);
  }, [hiddenMilestoneGroupIds, prunedHiddenMilestoneGroupIds]);

  useEffect(() => {
    if (prunedHiddenMilestoneIds.length === hiddenMilestoneIds.length) {
      return;
    }
    setHiddenMilestoneIds(prunedHiddenMilestoneIds);
  }, [hiddenMilestoneIds, prunedHiddenMilestoneIds]);

  const hiddenMilestoneGroupIdSet = useMemo(
    () => new Set(prunedHiddenMilestoneGroupIds),
    [prunedHiddenMilestoneGroupIds],
  );

  const hiddenMilestoneIdSet = useMemo(
    () => new Set(prunedHiddenMilestoneIds),
    [prunedHiddenMilestoneIds],
  );

  const explanationMilestoneBand = useMemo(
    () =>
      resolveExplanationMilestoneBand(
        { milestoneGroups, milestones },
        explanationView,
        hiddenMilestoneGroupIdSet,
      ),
    [
      explanationView,
      hiddenMilestoneGroupIdSet,
      milestoneGroups,
      milestones,
    ],
  );

  const visibleMilestoneGroupIds = explanationMilestoneBand.visibleGroupIds;
  const milestonesForBandLayout = explanationMilestoneBand.milestones;

  const toggleCollapsed = useCallback(
    (key: string) => {
      clearExplanationOnHumanViewChange();
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        collapsedRef.current = next;
        return next;
      });
    },
    [clearExplanationOnHumanViewChange],
  );

  const updateFilters = useCallback(
    (patch: Partial<ScheduleFilters>) => {
      clearExplanationOnHumanViewChange();
      setFilters((prev) => ({ ...prev, ...patch }));
      setTaskSelection(emptyTaskSelection());
    },
    [clearExplanationOnHumanViewChange, setTaskSelection],
  );

  const updateFieldFilters = useCallback(
    (build: (prev: ScheduleFilters) => ScheduleFilters["fieldFilters"]) => {
      clearExplanationOnHumanViewChange();
      setFilters((prev) => ({
        ...prev,
        fieldFilters: build(prev),
      }));
      setTaskSelection(emptyTaskSelection());
    },
    [clearExplanationOnHumanViewChange, setTaskSelection],
  );

  const patchFieldFilter = useCallback(
    (def: ScheduleFieldDef, patch: Partial<FieldFilterCondition>) => {
      updateFieldFilters((prev) => applyFieldFilterPatch(prev, def, patch));
    },
    [updateFieldFilters],
  );

  const setFilterViewState = useCallback((state: ScheduleFilterViewState) => {
    setFilters({
      ...state.filters,
      tags: [...state.filters.tags],
    });
    setSearchField(state.searchField);
    setHiddenMilestoneGroupIds([...state.hiddenMilestoneGroupIds]);
    setHiddenMilestoneIds([...state.hiddenMilestoneIds]);
    setCollapsed((prev) => {
      const next = mergeFilterViewCollapsedSet(
        prev,
        state.collapsedCategoryIds,
        state.collapsedGroupIds,
      );
      collapsedRef.current = next;
      return next;
    });
  }, []);

  const applyPartialFilterViewState = useCallback(
    (update: {
      filters?: ScheduleFilterViewState["filters"];
      searchField?: ScheduleFilterViewState["searchField"];
      hiddenMilestoneGroupIds?: ScheduleId[];
      hiddenMilestoneIds?: ScheduleId[];
      collapsed?: ReadonlySet<string>;
    }) => {
      if (update.filters !== undefined) {
        setFilters({
          ...update.filters,
          tags: [...update.filters.tags],
        });
      }
      if (update.searchField !== undefined) {
        setSearchField(update.searchField);
      }
      if (update.hiddenMilestoneGroupIds !== undefined) {
        setHiddenMilestoneGroupIds([...update.hiddenMilestoneGroupIds]);
      }
      if (update.hiddenMilestoneIds !== undefined) {
        setHiddenMilestoneIds([...update.hiddenMilestoneIds]);
      }
      if (update.collapsed !== undefined) {
        const next = new Set(update.collapsed);
        collapsedRef.current = next;
        setCollapsed(next);
      }
    },
    [],
  );

  const getFilterViewState = useCallback((): ScheduleFilterViewState => {
    const { collapsedCategoryIds, collapsedGroupIds } =
      collapsedIdsFromSet(collapsed);
    return {
      filters,
      searchField,
      hiddenMilestoneGroupIds: prunedHiddenMilestoneGroupIds,
      hiddenMilestoneIds: prunedHiddenMilestoneIds,
      collapsedCategoryIds,
      collapsedGroupIds,
    };
  }, [
    collapsed,
    filters,
    prunedHiddenMilestoneGroupIds,
    prunedHiddenMilestoneIds,
    searchField,
  ]);

  const setMilestoneGroupVisible = useCallback(
    (groupId: ScheduleId, visible: boolean) => {
      clearExplanationOnHumanViewChange();
      setHiddenMilestoneGroupIds((prev) => {
        const hidden = prev.includes(groupId);
        if (visible && hidden) return prev.filter((id) => id !== groupId);
        if (!visible && !hidden) return [...prev, groupId];
        return prev;
      });
    },
    [clearExplanationOnHumanViewChange],
  );

  const showAllMilestoneGroups = useCallback(() => {
    clearExplanationOnHumanViewChange();
    setHiddenMilestoneGroupIds([]);
  }, [clearExplanationOnHumanViewChange]);

  const setMilestoneMarkVisible = useCallback(
    (milestoneId: ScheduleId, visible: boolean) => {
      setHiddenMilestoneIds((prev) => {
        const hidden = prev.includes(milestoneId);
        if (visible && hidden) return prev.filter((id) => id !== milestoneId);
        if (!visible && !hidden) return [...prev, milestoneId];
        return prev;
      });
    },
    [],
  );

  const showAllMilestoneMarks = useCallback(() => {
    setHiddenMilestoneIds([]);
  }, []);

  const showOnlyMilestoneMark = useCallback(
    (milestoneId: ScheduleId) => {
      setHiddenMilestoneIds(
        hiddenMilestoneIdsForShowOnly(
          milestoneId,
          milestones,
          visibleMilestoneGroupIds,
        ),
      );
    },
    [milestones, visibleMilestoneGroupIds],
  );

  const showOnlyMilestoneGroup = useCallback(
    (groupId: ScheduleId) => {
      clearExplanationOnHumanViewChange();
      setHiddenMilestoneGroupIds(
        hiddenMilestoneGroupIdsForShowOnly(groupId, milestoneGroups),
      );
    },
    [clearExplanationOnHumanViewChange, milestoneGroups],
  );

  const setSearchFieldFromUi = useCallback(
    (field: SearchField) => {
      clearExplanationOnHumanViewChange();
      setSearchField(field);
    },
    [clearExplanationOnHumanViewChange],
  );

  return {
    filters,
    setFilters,
    searchField,
    setSearchField,
    collapsed,
    setCollapsed,
    collapsedRef,
    displayedCollapsed,
    hiddenMilestoneGroupIds,
    setHiddenMilestoneGroupIds,
    hiddenMilestoneIds,
    setHiddenMilestoneIds,
    prunedHiddenMilestoneGroupIds,
    prunedHiddenMilestoneIds,
    hiddenMilestoneGroupIdSet,
    hiddenMilestoneIdSet,
    visibleMilestoneGroupIds,
    milestonesForBandLayout,
    memberMap,
    assigneeFilterOptions,
    knownMemberIds,
    scheduleTags,
    toggleCollapsed,
    updateFilters,
    patchFieldFilter,
    updateFieldFilters,
    setFilterViewState,
    getFilterViewState,
    applyPartialFilterViewState,
    setMilestoneGroupVisible,
    showAllMilestoneGroups,
    showOnlyMilestoneGroup,
    setMilestoneMarkVisible,
    showAllMilestoneMarks,
    showOnlyMilestoneMark,
    setSearchFieldFromUi,
  };
}
