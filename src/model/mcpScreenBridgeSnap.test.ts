import { describe, expect, it } from "vitest";
import type { TaskBarAnchor } from "./connections";
import { DEFAULT_SIDEBAR_COLUMNS } from "./viewPreferences";
import {
  mcpExplanationOverlayBuildFromSnap,
  mcpReadPayloadFieldsFromSnap,
  mcpViewportFromBridgeSnap,
  mcpViewFieldsFromBridgeSnap,
  type McpScreenBridgeReadPayloadSnap,
  type McpScreenBridgeViewSnap,
} from "./mcpScreenBridgeSnap";
import type { VisibleRow } from "./types";

const baseViewSnap = (): McpScreenBridgeViewSnap => ({
  collapsed: new Set(["cat:1"]),
  userCollapsed: new Set(),
  explanationView: null,
  displayScalePreference: "auto",
  effectiveUiScale: 1,
  rowDensity: "comfortable",
  showLightningLine: true,
  sidebarColumns: DEFAULT_SIDEBAR_COLUMNS,
  colorSchemePreference: "system",
  resolvedColorScheme: "light",
  calendar: null,
  categories: [],
  outline: undefined,
});

const viewportFields = {
  viewStart: new Date("2026-01-01T00:00:00Z"),
  viewTotalDays: 30,
  scrollX: 1,
  pxPerDay: 2,
  chartWidth: 100,
  scrollY: 3,
  rowHeight: 24,
  bodyHeight: 400,
  visibleRows: [] as VisibleRow[],
};

describe("mcpScreenBridgeSnap", () => {
  it("maps bridge viewport fields to McpViewportForReadTools names", () => {
    expect(mcpViewportFromBridgeSnap(viewportFields)).toEqual({
      timelineStart: viewportFields.viewStart,
      totalDays: viewportFields.viewTotalDays,
      scrollX: viewportFields.scrollX,
      pxPerDay: viewportFields.pxPerDay,
      chartWidth: viewportFields.chartWidth,
      scrollY: viewportFields.scrollY,
      rowHeight: viewportFields.rowHeight,
      bodyHeight: viewportFields.bodyHeight,
      visibleRows: viewportFields.visibleRows,
    });
  });

  it("picks view fields required for read tools", () => {
    const snap = baseViewSnap();
    const picked = mcpViewFieldsFromBridgeSnap(snap);
    expect(picked.collapsed).toBe(snap.collapsed);
    expect(picked.categories).toBe(snap.categories);
    expect(Object.keys(picked).sort()).toEqual(
      [
        "calendar",
        "categories",
        "collapsed",
        "colorSchemePreference",
        "displayScalePreference",
        "effectiveUiScale",
        "explanationView",
        "outline",
        "resolvedColorScheme",
        "rowDensity",
        "showLightningLine",
        "sidebarColumns",
        "userCollapsed",
      ].sort(),
    );
  });

  it("uses live chart anchors when provided for overlay build", () => {
    const live = new Map<string, TaskBarAnchor>([
      ["t1", { x: 1, right: 4, y: 2 }],
    ]);
    const snap: McpScreenBridgeReadPayloadSnap = {
      ...baseViewSnap(),
      ...viewportFields,
      barHeight: 10,
      dateToX: () => 0,
      explanationOverlay: null,
    };
    const build = mcpExplanationOverlayBuildFromSnap(snap, live);
    expect(build.liveAnchors).toBe(live);
  });

  it("includes collapsed viewport and overlay build in read payload fields", () => {
    const snap: McpScreenBridgeReadPayloadSnap = {
      ...baseViewSnap(),
      ...viewportFields,
      barHeight: 10,
      dateToX: () => 0,
      explanationOverlay: null,
    };
    const fields = mcpReadPayloadFieldsFromSnap(snap, null);
    expect(fields.collapsed).toBe(snap.collapsed);
    expect(fields.viewport.timelineStart).toBe(snap.viewStart);
    expect(fields.explanationOverlayBuild.visibleRows).toBe(snap.visibleRows);
  });
});
