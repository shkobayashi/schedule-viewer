import { DEFAULT_FILTERS, pruneHiddenMilestoneGroupIds } from "./filterChips";
import {
  categoryCollapseKey,
  filtersAreDefault,
  groupCollapseKey,
} from "./rows";
import { pruneSelectedTags } from "./taskTags";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  type Category,
  type Milestone,
  type MilestoneGroup,
  type ScheduleDocument,
  type ScheduleFilters,
  type ScheduleId,
  type StatusFilter,
  type ConfidenceFilter,
  type OverdueFilter,
  type RelationFilter,
} from "./types";

export const SCHEDULE_FILTER_PERSISTENCE_VERSION = 1;

export type SearchField = "name" | "note";

export type ScheduleFilterViewState = {
  filters: ScheduleFilters;
  searchField: SearchField;
  hiddenMilestoneGroupIds: ScheduleId[];
  collapsedCategoryIds: ScheduleId[];
  collapsedGroupIds: ScheduleId[];
};

export type ScheduleFilterPersistenceFile = {
  version: typeof SCHEDULE_FILTER_PERSISTENCE_VERSION;
  path: string;
  filters: ScheduleFilters;
  searchField: SearchField;
  hiddenMilestoneGroupIds: ScheduleId[];
  collapsedCategoryIds: ScheduleId[];
  collapsedGroupIds: ScheduleId[];
};

export type ParsedScheduleFilterPersistence =
  | { ok: true; data: ScheduleFilterPersistenceFile }
  | { ok: false };

const CONFIDENCE_VALUES: readonly ConfidenceFilter[] = [
  "all",
  "tentative",
  "committed",
];

const OVERDUE_VALUES: readonly OverdueFilter[] = ["all", "overdue"];

const RELATION_VALUES: readonly RelationFilter[] = ["all", "broken"];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseIdArrayField(value: unknown): ScheduleId[] | null {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every((id) => typeof id === "string" && id.length > 0)) {
    return null;
  }
  return [...value];
}

function sortedIds(ids: readonly ScheduleId[]): ScheduleId[] {
  return [...ids].sort();
}

function parseFiltersRecord(record: Record<string, unknown>): ScheduleFilters | null {
  const assignee = record.assignee;
  const status = record.status;
  const confidence = record.confidence;
  const overdue = record.overdue;
  const relation = record.relation;
  const milestone = record.milestone;
  const tags = record.tags;
  const search = record.search;
  const noteSearch = record.noteSearch;
  if (typeof assignee !== "string") return null;
  if (!isNonEmptyString(status)) return null;
  if (!CONFIDENCE_VALUES.includes(confidence as ConfidenceFilter)) return null;
  if (!OVERDUE_VALUES.includes(overdue as OverdueFilter)) return null;
  if (!RELATION_VALUES.includes(relation as RelationFilter)) return null;
  if (typeof milestone !== "string") return null;
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
    return null;
  }
  if (typeof search !== "string" || typeof noteSearch !== "string") return null;
  return {
    assignee,
    status: status as StatusFilter,
    confidence: confidence as ConfidenceFilter,
    overdue: overdue as OverdueFilter,
    relation: relation as RelationFilter,
    milestone,
    tags: [...tags],
    search,
    noteSearch,
  };
}

export function parseScheduleFilterPersistence(
  text: string,
  expectedPath: string,
): ParsedScheduleFilterPersistence {
  const normalized = text.replace(/^\uFEFF/, "");
  let data: unknown;
  try {
    data = JSON.parse(normalized);
  } catch {
    return { ok: false };
  }
  if (typeof data !== "object" || data == null) {
    return { ok: false };
  }
  const record = data as Record<string, unknown>;
  if (record.version !== SCHEDULE_FILTER_PERSISTENCE_VERSION) {
    return { ok: false };
  }
  const path = record.path;
  if (!isNonEmptyString(path) || path !== expectedPath) {
    return { ok: false };
  }
  const filtersRecord = record.filters;
  if (typeof filtersRecord !== "object" || filtersRecord == null) {
    return { ok: false };
  }
  const filters = parseFiltersRecord(filtersRecord as Record<string, unknown>);
  if (!filters) return { ok: false };
  const searchField = record.searchField;
  if (searchField !== "name" && searchField !== "note") {
    return { ok: false };
  }
  const hidden = record.hiddenMilestoneGroupIds;
  if (
    !Array.isArray(hidden) ||
    !hidden.every((id) => typeof id === "string" && id.length > 0)
  ) {
    return { ok: false };
  }
  const collapsedCategoryIds = parseIdArrayField(record.collapsedCategoryIds);
  if (collapsedCategoryIds == null) {
    return { ok: false };
  }
  const collapsedGroupIds = parseIdArrayField(record.collapsedGroupIds);
  if (collapsedGroupIds == null) {
    return { ok: false };
  }
  return {
    ok: true,
    data: {
      version: SCHEDULE_FILTER_PERSISTENCE_VERSION,
      path,
      filters,
      searchField,
      hiddenMilestoneGroupIds: [...hidden],
      collapsedCategoryIds,
      collapsedGroupIds,
    },
  };
}

export function isDefaultScheduleFilterViewState(
  state: ScheduleFilterViewState,
): boolean {
  if (!filtersAreDefault(state.filters)) return false;
  if (state.hiddenMilestoneGroupIds.length > 0) return false;
  if (state.collapsedCategoryIds.length > 0) return false;
  if (state.collapsedGroupIds.length > 0) return false;
  return true;
}

export function serializeScheduleFilterPersistence(
  path: string,
  state: ScheduleFilterViewState,
): string {
  const file: ScheduleFilterPersistenceFile = {
    version: SCHEDULE_FILTER_PERSISTENCE_VERSION,
    path,
    filters: state.filters,
    searchField: state.searchField,
    hiddenMilestoneGroupIds: state.hiddenMilestoneGroupIds,
    collapsedCategoryIds: sortedIds(state.collapsedCategoryIds),
    collapsedGroupIds: sortedIds(state.collapsedGroupIds),
  };
  return JSON.stringify(file);
}

export function defaultScheduleFilterViewState(): ScheduleFilterViewState {
  return {
    filters: { ...DEFAULT_FILTERS, tags: [] },
    searchField: "name",
    hiddenMilestoneGroupIds: [],
    collapsedCategoryIds: [],
    collapsedGroupIds: [],
  };
}

export type PruneFiltersContext = {
  categories: Category[];
  milestones: Milestone[];
  milestoneGroups: MilestoneGroup[];
  knownMemberIds: ReadonlySet<string>;
};

export type PruneScheduleFilterOptions = {
  pruneAssignee?: boolean;
  pruneCollapse?: boolean;
};

export function pruneContextFromScheduleDocument(
  document: Pick<ScheduleDocument, "categories" | "milestones" | "milestoneGroups">,
  knownMemberIds: ReadonlySet<string>,
): PruneFiltersContext {
  return {
    categories: document.categories,
    milestones: document.milestones,
    milestoneGroups: document.milestoneGroups,
    knownMemberIds,
  };
}

export function pruneScheduleFilterViewState(
  state: ScheduleFilterViewState,
  context: PruneFiltersContext,
  options?: PruneScheduleFilterOptions,
): ScheduleFilterViewState {
  const pruneAssignee = options?.pruneAssignee ?? true;
  const scheduleTags = collectTagsFromCategories(context.categories);
  let filters = { ...state.filters };
  if (
    pruneAssignee &&
    filters.assignee !== "all" &&
    filters.assignee !== UNASSIGNED_FILTER &&
    !context.knownMemberIds.has(filters.assignee)
  ) {
    filters = { ...filters, assignee: "all" };
  }
  if (
    filters.milestone !== "all" &&
    filters.milestone !== NO_MILESTONE_FILTER &&
    !context.milestones.some((m) => m.id === filters.milestone)
  ) {
    filters = { ...filters, milestone: "all" };
  }
  const prunedTags = pruneSelectedTags(filters.tags, scheduleTags);
  if (
    prunedTags.length !== filters.tags.length ||
    prunedTags.some((tag, index) => tag !== filters.tags[index])
  ) {
    filters = { ...filters, tags: prunedTags };
  }
  const hiddenMilestoneGroupIds = pruneHiddenMilestoneGroupIds(
    state.hiddenMilestoneGroupIds,
    context.milestoneGroups,
  );
  const pruneCollapse = options?.pruneCollapse ?? true;
  let collapsedCategoryIds = state.collapsedCategoryIds;
  let collapsedGroupIds = state.collapsedGroupIds;
  if (pruneCollapse) {
    const categoryIds = new Set(context.categories.map((category) => category.id));
    collapsedCategoryIds = state.collapsedCategoryIds.filter((id) =>
      categoryIds.has(id),
    );
    const groupIds = new Set(
      context.categories.flatMap((category) =>
        category.groups.map((group) => group.id),
      ),
    );
    collapsedGroupIds = state.collapsedGroupIds.filter((id) => groupIds.has(id));
  }
  return {
    filters,
    searchField: state.searchField,
    hiddenMilestoneGroupIds,
    collapsedCategoryIds,
    collapsedGroupIds,
  };
}

export function collapsedIdsFromSet(collapsed: ReadonlySet<string>): {
  collapsedCategoryIds: ScheduleId[];
  collapsedGroupIds: ScheduleId[];
} {
  const collapsedCategoryIds: ScheduleId[] = [];
  const collapsedGroupIds: ScheduleId[] = [];
  const categoryPrefix = "category:";
  const groupPrefix = "group:";
  for (const key of collapsed) {
    if (key.startsWith(categoryPrefix)) {
      collapsedCategoryIds.push(key.slice(categoryPrefix.length));
    } else if (key.startsWith(groupPrefix)) {
      collapsedGroupIds.push(key.slice(groupPrefix.length));
    }
  }
  return {
    collapsedCategoryIds: sortedIds(collapsedCategoryIds),
    collapsedGroupIds: sortedIds(collapsedGroupIds),
  };
}

export function collapsedSetFromIds(
  collapsedCategoryIds: readonly ScheduleId[],
  collapsedGroupIds: readonly ScheduleId[],
): Set<string> {
  const next = new Set<string>();
  for (const id of collapsedCategoryIds) {
    next.add(categoryCollapseKey(id));
  }
  for (const id of collapsedGroupIds) {
    next.add(groupCollapseKey(id));
  }
  return next;
}

function collectTagsFromCategories(categories: Category[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const category of categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        for (const tag of task.tags ?? []) {
          if (!seen.has(tag)) {
            seen.add(tag);
            ordered.push(tag);
          }
        }
      }
    }
  }
  return ordered;
}

export function viewStateFromPersistence(
  data: ScheduleFilterPersistenceFile,
): ScheduleFilterViewState {
  return {
    filters: {
      ...data.filters,
      tags: [...data.filters.tags],
    },
    searchField: data.searchField,
    hiddenMilestoneGroupIds: [...data.hiddenMilestoneGroupIds],
    collapsedCategoryIds: [...data.collapsedCategoryIds],
    collapsedGroupIds: [...data.collapsedGroupIds],
  };
}
