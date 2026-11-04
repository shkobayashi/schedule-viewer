import type { ColorSchemePreference } from "./colorScheme";
import { parseFieldFiltersFromPersistence } from "./fieldFilters";
import type { SearchField } from "./scheduleFilterPersistence";
import type { DisplayScalePreference } from "./uiScale";
import type { RowDensity, SidebarColumnsPreference } from "./viewPreferences";
import { DEFAULT_SIDEBAR_COLUMNS } from "./viewPreferences";
import {
  categoryCollapseKey,
  groupCollapseKey,
  hierarchyCollapseKey,
} from "./rows";
import type { ScheduleFilters, ScheduleId } from "./types";
import type { GridTier } from "./timeline";

export function mcpSetViewTouchesFilterState(patch: McpSetViewPatch): boolean {
  return (
    patch.filters !== undefined ||
    patch.searchField !== undefined ||
    patch.hiddenMilestoneGroupIds !== undefined ||
    patch.collapsedCategoryIds !== undefined ||
    patch.collapsedGroupIds !== undefined ||
    patch.collapsedOutlineHeadingIds !== undefined
  );
}

/** Fit to width は横だけ変え、縦スクロールはそのままにする。 */
export function scrollYAfterFitToWidth(currentScrollY: number): number {
  return currentScrollY;
}

export function mergeMcpSetViewCollapsed(
  current: ReadonlySet<string>,
  patch: McpSetViewPatch,
): Set<string> {
  const next = new Set(current);
  if (patch.collapsedCategoryIds !== undefined) {
    for (const key of next) {
      if (key.startsWith("category:")) next.delete(key);
    }
    for (const id of patch.collapsedCategoryIds) {
      next.add(categoryCollapseKey(id));
    }
  }
  if (patch.collapsedGroupIds !== undefined) {
    for (const key of next) {
      if (key.startsWith("group:")) next.delete(key);
    }
    for (const id of patch.collapsedGroupIds) {
      next.add(groupCollapseKey(id));
    }
  }
  if (patch.collapsedOutlineHeadingIds !== undefined) {
    for (const key of next) {
      if (key.startsWith("hierarchy:")) next.delete(key);
    }
    for (const id of patch.collapsedOutlineHeadingIds) {
      next.add(hierarchyCollapseKey(id));
    }
  }
  return next;
}

export type McpSetViewCalendarAction =
  | { kind: "clear" }
  | { kind: "importPath"; path: string }
  | { kind: "removeBinding" };

export type McpSetViewPatch = {
  filters?: ScheduleFilters;
  searchField?: SearchField;
  hiddenMilestoneGroupIds?: ScheduleId[];
  collapsedCategoryIds?: ScheduleId[];
  collapsedGroupIds?: ScheduleId[];
  collapsedOutlineHeadingIds?: ScheduleId[];
  displayScale?: DisplayScalePreference;
  rowDensity?: RowDensity;
  showLightningLine?: boolean;
  sidebarColumns?: SidebarColumnsPreference;
  colorScheme?: ColorSchemePreference;
  calendar?: McpSetViewCalendarAction;
  zoomTier?: GridTier;
  scrollX?: number;
  scrollY?: number;
  fitToWidth?: boolean;
};

const CONFIDENCE_VALUES = ["all", "tentative", "committed"] as const;
const OVERDUE_VALUES = ["all", "overdue"] as const;
const RELATION_VALUES = ["all", "broken"] as const;
const DISPLAY_SCALE_VALUES = ["auto", 0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const ZOOM_TIERS = ["day", "week", "month"] as const;

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0)
  );
}

function parseFilters(value: unknown): ScheduleFilters | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
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
  if (typeof status !== "string" || status.length === 0) return null;
  if (!CONFIDENCE_VALUES.includes(confidence as (typeof CONFIDENCE_VALUES)[number])) {
    return null;
  }
  if (!OVERDUE_VALUES.includes(overdue as (typeof OVERDUE_VALUES)[number])) {
    return null;
  }
  if (!RELATION_VALUES.includes(relation as (typeof RELATION_VALUES)[number])) {
    return null;
  }
  if (typeof milestone !== "string") return null;
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
    return null;
  }
  if (typeof search !== "string" || typeof noteSearch !== "string") {
    return null;
  }
  const fieldFilters = parseFieldFiltersFromPersistence(record.fieldFilters);
  if (fieldFilters == null) return null;
  return {
    assignee,
    status: status as ScheduleFilters["status"],
    confidence: confidence as ScheduleFilters["confidence"],
    overdue: overdue as ScheduleFilters["overdue"],
    relation: relation as ScheduleFilters["relation"],
    milestone,
    tags: [...tags],
    search,
    noteSearch,
    fieldFilters,
  };
}

function parseSidebarColumns(value: unknown): SidebarColumnsPreference | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    start: record.start === true,
    end: record.end === true,
    duration: record.duration === true,
    progress: record.progress === true,
    status: record.status === true,
  };
}

function parseDisplayScale(value: unknown): DisplayScalePreference | null {
  if (value === "auto") return "auto";
  if (typeof value === "number") {
    if ((DISPLAY_SCALE_VALUES as readonly number[]).includes(value)) {
      return value as DisplayScalePreference;
    }
  }
  return null;
}

function parseColorScheme(value: unknown): ColorSchemePreference | null {
  if (value === "system" || value === "light" || value === "dark") {
    return value;
  }
  return null;
}

function parseCalendar(value: unknown): McpSetViewCalendarAction | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const action = record.action;
  if (action === "clear") return { kind: "clear" };
  if (action === "removeBinding") return { kind: "removeBinding" };
  if (action === "importPath") {
    if (typeof record.path !== "string" || record.path.length === 0) {
      return null;
    }
    return { kind: "importPath", path: record.path };
  }
  return null;
}

export function parseMcpSetViewPatch(
  envelope: Record<string, unknown>,
): { ok: true; patch: McpSetViewPatch } | { ok: false; message: string } {
  const patch: McpSetViewPatch = {};
  let hasField = false;

  if (envelope.filters !== undefined) {
    const filters = parseFilters(envelope.filters);
    if (filters == null) {
      return { ok: false, message: "filters の形が正しくありません。" };
    }
    patch.filters = filters;
    hasField = true;
  }
  if (envelope.searchField !== undefined) {
    if (envelope.searchField !== "name" && envelope.searchField !== "note") {
      return { ok: false, message: "searchField は name か note だけにしてください。" };
    }
    patch.searchField = envelope.searchField;
    hasField = true;
  }
  if (envelope.hiddenMilestoneGroupIds !== undefined) {
    if (!isStringArray(envelope.hiddenMilestoneGroupIds)) {
      return {
        ok: false,
        message: "hiddenMilestoneGroupIds は文字列の配列にしてください。",
      };
    }
    patch.hiddenMilestoneGroupIds = envelope.hiddenMilestoneGroupIds;
    hasField = true;
  }
  if (envelope.collapsedCategoryIds !== undefined) {
    if (!isStringArray(envelope.collapsedCategoryIds)) {
      return { ok: false, message: "collapsedCategoryIds は文字列の配列にしてください。" };
    }
    patch.collapsedCategoryIds = envelope.collapsedCategoryIds;
    hasField = true;
  }
  if (envelope.collapsedGroupIds !== undefined) {
    if (!isStringArray(envelope.collapsedGroupIds)) {
      return { ok: false, message: "collapsedGroupIds は文字列の配列にしてください。" };
    }
    patch.collapsedGroupIds = envelope.collapsedGroupIds;
    hasField = true;
  }
  if (envelope.collapsedOutlineHeadingIds !== undefined) {
    if (!isStringArray(envelope.collapsedOutlineHeadingIds)) {
      return {
        ok: false,
        message: "collapsedOutlineHeadingIds は文字列の配列にしてください。",
      };
    }
    patch.collapsedOutlineHeadingIds = envelope.collapsedOutlineHeadingIds;
    hasField = true;
  }
  if (envelope.displayScale !== undefined) {
    const displayScale = parseDisplayScale(envelope.displayScale);
    if (displayScale == null) {
      return { ok: false, message: "displayScale の値が正しくありません。" };
    }
    patch.displayScale = displayScale;
    hasField = true;
  }
  if (envelope.rowDensity !== undefined) {
    if (envelope.rowDensity !== "comfortable" && envelope.rowDensity !== "compact") {
      return { ok: false, message: "rowDensity は comfortable か compact だけにしてください。" };
    }
    patch.rowDensity = envelope.rowDensity;
    hasField = true;
  }
  if (envelope.showLightningLine !== undefined) {
    if (typeof envelope.showLightningLine !== "boolean") {
      return { ok: false, message: "showLightningLine は true か false だけにしてください。" };
    }
    patch.showLightningLine = envelope.showLightningLine;
    hasField = true;
  }
  if (envelope.sidebarColumns !== undefined) {
    const sidebarColumns = parseSidebarColumns(envelope.sidebarColumns);
    if (sidebarColumns == null) {
      return { ok: false, message: "sidebarColumns の形が正しくありません。" };
    }
    patch.sidebarColumns = sidebarColumns;
    hasField = true;
  }
  if (envelope.colorScheme !== undefined) {
    const colorScheme = parseColorScheme(envelope.colorScheme);
    if (colorScheme == null) {
      return { ok: false, message: "colorScheme は system、light、dark だけにしてください。" };
    }
    patch.colorScheme = colorScheme;
    hasField = true;
  }
  if (envelope.calendar !== undefined) {
    const calendar = parseCalendar(envelope.calendar);
    if (calendar == null) {
      return {
        ok: false,
        message: "calendar は action と path（importPath のとき）を正しく渡してください。",
      };
    }
    patch.calendar = calendar;
    hasField = true;
  }
  if (envelope.zoomTier !== undefined) {
    if (!ZOOM_TIERS.includes(envelope.zoomTier as (typeof ZOOM_TIERS)[number])) {
      return { ok: false, message: "zoomTier は day、week、month だけにしてください。" };
    }
    patch.zoomTier = envelope.zoomTier as GridTier;
    hasField = true;
  }
  if (envelope.scrollX !== undefined) {
    if (typeof envelope.scrollX !== "number" || !Number.isFinite(envelope.scrollX)) {
      return { ok: false, message: "scrollX は数値にしてください。" };
    }
    patch.scrollX = envelope.scrollX;
    hasField = true;
  }
  if (envelope.scrollY !== undefined) {
    if (typeof envelope.scrollY !== "number" || !Number.isFinite(envelope.scrollY)) {
      return { ok: false, message: "scrollY は数値にしてください。" };
    }
    patch.scrollY = envelope.scrollY;
    hasField = true;
  }
  if (envelope.fitToWidth === true) {
    patch.fitToWidth = true;
    hasField = true;
  } else if (envelope.fitToWidth === false) {
    return { ok: false, message: "fitToWidth は true だけ指定できます。" };
  }

  if (!hasField) {
    return { ok: false, message: "見方を変える項目を1つ以上渡してください。" };
  }

  if (patch.sidebarColumns == null && envelope.sidebarColumns === undefined) {
    // no-op
  } else if (patch.sidebarColumns == null) {
    patch.sidebarColumns = { ...DEFAULT_SIDEBAR_COLUMNS };
  }

  return { ok: true, patch };
}
