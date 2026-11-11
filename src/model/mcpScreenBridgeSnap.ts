import type { CalendarDocument } from "./calendarTypes";
import type { ColorSchemePreference } from "./colorScheme";
import type { ResolvedColorScheme } from "./palette";
import type { DisplayScalePreference } from "./uiScale";
import type { RowDensity, SidebarColumnsPreference } from "./viewPreferences";
import type { ColorItem } from "./colorCatalog";
import type { StatusItem } from "./statusCatalog";
import type { TaskBarAnchor } from "./connections";
import type {
  BuildMcpExplanationOverlayInput,
  ExplanationOverlayState,
} from "./explainOverlay";
import type { ExplanationViewState } from "./explainView";
import { buildTaskBarAnchorsForOverlay } from "./explainOverlayLayout";
import type { McpViewportForReadTools } from "./mcpVisible";
import type { McpViewForReadToolsInput } from "./screenContext";
import {
  buildFilteredTasksPayload,
  buildSelectedTaskPayload,
  buildSelectedTasksPayload,
} from "./screenContext";
import type { Member, MemberId } from "./memberTypes";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  OutlineRoot,
  ScheduleFieldDef,
  ScheduleFilters,
  ScheduleId,
  ScheduleLevelDef,
  VisibleRow,
} from "./types";

/** Rust `BridgeRequest` と同じ形（webview へ届くペイロード）。 */
export type McpScreenRequest = {
  id: string;
  generation: number;
  tool: string;
  arguments: unknown;
};

export type McpScreenBridgeViewportSnap = {
  viewStart: Date;
  viewTotalDays: number;
  scrollX: number;
  pxPerDay: number;
  chartWidth: number;
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
  visibleRows: VisibleRow[];
};

export function mcpViewportFromBridgeSnap(
  snap: McpScreenBridgeViewportSnap,
): McpViewportForReadTools {
  return {
    timelineStart: snap.viewStart,
    totalDays: snap.viewTotalDays,
    scrollX: snap.scrollX,
    pxPerDay: snap.pxPerDay,
    chartWidth: snap.chartWidth,
    scrollY: snap.scrollY,
    rowHeight: snap.rowHeight,
    bodyHeight: snap.bodyHeight,
    visibleRows: snap.visibleRows,
  };
}

export type McpScreenBridgeViewSnap = {
  collapsed: ReadonlySet<string>;
  userCollapsed: ReadonlySet<string>;
  explanationView: ExplanationViewState | null;
  displayScalePreference: DisplayScalePreference;
  effectiveUiScale: number;
  rowDensity: RowDensity;
  showLightningLine: boolean;
  sidebarColumns: SidebarColumnsPreference;
  colorSchemePreference: ColorSchemePreference;
  resolvedColorScheme: ResolvedColorScheme;
  calendar: CalendarDocument | null;
  categories: Category[];
  outline?: OutlineRoot | undefined;
};

export function mcpViewFieldsFromBridgeSnap(
  snap: McpScreenBridgeViewSnap,
): Pick<
  McpViewForReadToolsInput,
  | "collapsed"
  | "userCollapsed"
  | "explanationView"
  | "displayScalePreference"
  | "effectiveUiScale"
  | "rowDensity"
  | "showLightningLine"
  | "sidebarColumns"
  | "colorSchemePreference"
  | "resolvedColorScheme"
  | "calendar"
  | "categories"
  | "outline"
> {
  return {
    collapsed: snap.collapsed,
    userCollapsed: snap.userCollapsed,
    explanationView: snap.explanationView,
    displayScalePreference: snap.displayScalePreference,
    effectiveUiScale: snap.effectiveUiScale,
    rowDensity: snap.rowDensity,
    showLightningLine: snap.showLightningLine,
    sidebarColumns: snap.sidebarColumns,
    colorSchemePreference: snap.colorSchemePreference,
    resolvedColorScheme: snap.resolvedColorScheme,
    calendar: snap.calendar,
    categories: snap.categories,
    outline: snap.outline,
  };
}

export type McpScreenBridgeOverlayGeometrySnap = McpScreenBridgeViewportSnap & {
  barHeight: number;
  dateToX: (d: Date) => number;
};

export function mcpExplanationOverlayBuildFromSnap(
  snap: McpScreenBridgeOverlayGeometrySnap,
  liveAnchorsFromChart: ReadonlyMap<ScheduleId, TaskBarAnchor> | null | undefined,
): Omit<BuildMcpExplanationOverlayInput, "overlay"> {
  return {
    visibleRows: snap.visibleRows,
    pxPerDay: snap.pxPerDay,
    scrollX: snap.scrollX,
    scrollY: snap.scrollY,
    rowHeight: snap.rowHeight,
    bodyHeight: snap.bodyHeight,
    chartWidth: snap.chartWidth,
    timelineStart: snap.viewStart,
    liveAnchors:
      liveAnchorsFromChart ??
      buildTaskBarAnchorsForOverlay({
        visibleRows: snap.visibleRows,
        scrollY: snap.scrollY,
        rowHeight: snap.rowHeight,
        barHeight: snap.barHeight,
        dateToX: snap.dateToX,
        pxPerDay: snap.pxPerDay,
      }),
  };
}

export type McpScreenBridgeReadPayloadSnap = McpScreenBridgeViewSnap &
  McpScreenBridgeOverlayGeometrySnap & {
    explanationOverlay: ExplanationOverlayState | null;
  };

export type McpReadPayloadFieldsFromSnap = Pick<
  McpViewForReadToolsInput,
  keyof ReturnType<typeof mcpViewFieldsFromBridgeSnap>
> & {
  explanationOverlay: ExplanationOverlayState | null;
  explanationOverlayBuild: Omit<BuildMcpExplanationOverlayInput, "overlay">;
  viewport: McpViewportForReadTools;
};

export function mcpReadPayloadFieldsFromSnap(
  snap: McpScreenBridgeReadPayloadSnap,
  liveAnchorsFromChart: ReadonlyMap<ScheduleId, TaskBarAnchor> | null | undefined,
): McpReadPayloadFieldsFromSnap {
  return {
    ...mcpViewFieldsFromBridgeSnap(snap),
    explanationOverlay: snap.explanationOverlay,
    explanationOverlayBuild: mcpExplanationOverlayBuildFromSnap(
      snap,
      liveAnchorsFromChart,
    ),
    viewport: mcpViewportFromBridgeSnap(snap),
  };
}

export type McpScreenBridgeTaskCatalogSnap = {
  categories: Category[];
  outline?: OutlineRoot | undefined;
  title: string;
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
  statuses: readonly StatusItem[];
  colors: readonly ColorItem[] | null;
  mcpMembers: readonly Member[];
  levels?: ScheduleLevelDef[] | null;
  fields?: readonly ScheduleFieldDef[] | undefined;
};

export type McpSelectedTaskPayloadInput = Parameters<
  typeof buildSelectedTaskPayload
>[0];

export type McpSelectedTasksPayloadInput = Parameters<
  typeof buildSelectedTasksPayload
>[0];

export type McpFilteredTasksPayloadInput = Parameters<
  typeof buildFilteredTasksPayload
>[0];

export type McpScreenBridgeSelectedTaskSnap = McpScreenBridgeReadPayloadSnap &
  McpScreenBridgeTaskCatalogSnap & {
    filters: ScheduleFilters;
    today: string;
    memberMap: Map<MemberId, Member> | null;
    lineageIds: ReadonlySet<ScheduleId> | null;
    selectedTaskId: ScheduleId | null;
  };

export function mcpSelectedTaskPayloadInputFromSnap(
  snap: McpScreenBridgeSelectedTaskSnap,
  liveAnchorsFromChart: ReadonlyMap<ScheduleId, TaskBarAnchor> | null | undefined,
): McpSelectedTaskPayloadInput {
  return {
    ...mcpReadPayloadFieldsFromSnap(snap, liveAnchorsFromChart),
    categories: snap.categories,
    outline: snap.outline,
    title: snap.title,
    milestoneGroups: snap.milestoneGroups,
    milestones: snap.milestones,
    filters: snap.filters,
    today: snap.today,
    memberCatalog: snap.memberMap,
    lineageIds: snap.lineageIds,
    selectedTaskId: snap.selectedTaskId,
    statuses: snap.statuses,
    colors: snap.colors,
    mcpMembers: snap.mcpMembers,
    levels: snap.levels,
    fields: snap.fields,
  };
}

export type McpScreenBridgeSelectedTasksSnap = McpScreenBridgeReadPayloadSnap &
  McpScreenBridgeTaskCatalogSnap & {
    selectedTaskIds: readonly ScheduleId[];
  };

export function mcpSelectedTasksPayloadInputFromSnap(
  snap: McpScreenBridgeSelectedTasksSnap,
  liveAnchorsFromChart: ReadonlyMap<ScheduleId, TaskBarAnchor> | null | undefined,
): McpSelectedTasksPayloadInput {
  return {
    ...mcpReadPayloadFieldsFromSnap(snap, liveAnchorsFromChart),
    categories: snap.categories,
    outline: snap.outline,
    title: snap.title,
    milestoneGroups: snap.milestoneGroups,
    milestones: snap.milestones,
    selectedTaskIds: snap.selectedTaskIds,
    statuses: snap.statuses,
    colors: snap.colors,
    mcpMembers: snap.mcpMembers,
    levels: snap.levels,
    fields: snap.fields,
  };
}

export type McpScreenBridgeFilteredTasksSnap = McpScreenBridgeReadPayloadSnap &
  McpScreenBridgeTaskCatalogSnap & {
    filters: ScheduleFilters;
    lineageTaskId: ScheduleId | null;
    lineageIncludesConnections: boolean;
    hiddenMilestoneGroupIds: ScheduleId[];
    hiddenMilestoneIds: ScheduleId[];
    today: string;
    memberMap: Map<MemberId, Member> | null;
    lineageIds: ReadonlySet<ScheduleId> | null;
  };

export function mcpFilteredTasksPayloadInputFromSnap(
  snap: McpScreenBridgeFilteredTasksSnap,
  liveAnchorsFromChart: ReadonlyMap<ScheduleId, TaskBarAnchor> | null | undefined,
): McpFilteredTasksPayloadInput {
  return {
    ...mcpReadPayloadFieldsFromSnap(snap, liveAnchorsFromChart),
    categories: snap.categories,
    outline: snap.outline,
    title: snap.title,
    filters: snap.filters,
    lineageTaskId: snap.lineageTaskId,
    lineageIncludesConnections: snap.lineageIncludesConnections,
    hiddenMilestoneGroupIds: snap.hiddenMilestoneGroupIds,
    hiddenMilestoneIds: snap.hiddenMilestoneIds,
    milestoneGroups: snap.milestoneGroups,
    milestones: snap.milestones,
    today: snap.today,
    memberCatalog: snap.memberMap,
    lineageIds: snap.lineageIds,
    statuses: snap.statuses,
    colors: snap.colors,
    mcpMembers: snap.mcpMembers,
    levels: snap.levels,
    fields: snap.fields,
  };
}
