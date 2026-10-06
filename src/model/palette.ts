export type ResolvedColorScheme = "light" | "dark";

export type StatusBarColors = {
  bg: string;
  fill: string | null;
  border: string;
};

export type ChartPalette = {
  summaryCovered: string;
  summaryGap: string;
  headerBorder: string;
  monthGrid: string;
  textPrimary: string;
  textSecondary: string;
  nonWorking: string;
  gridMonday: string;
  gridWeekday: string;
  gridBodyMonday: string;
  gridBodyWeekday: string;
  gridMonth: string;
  rowBorder: string;
  categoryRow: string;
  groupRow: string;
  linkOk: string;
  linkBroken: string;
  linkTargetStroke: string;
  lightning: string;
  resizeHandle: string;
  dragDateFill: string;
  dragDateStroke: string;
  milestoneDiamond: string;
  milestoneDiamondStroke: string;
  milestoneBandBorder: string;
  unassignedStroke: string;
  unknownStroke: string;
  unassignedCap: string;
  unknownCap: string;
  overrunOverlay: string;
  statusNotStarted: StatusBarColors;
  statusInProgress: StatusBarColors;
  statusDone: StatusBarColors;
  overdueInProgress: StatusBarColors;
  overdueOther: StatusBarColors;
  exportBg: string;
  dependencyMarkerOk: string;
  dependencyMarkerBroken: string;
  barLabelMuted: string;
  barLabelOnFill: string;
};

export type CssPalette = {
  bg: string;
  panel: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
  today: string;
  danger: string;
  dangerOn: string;
  dangerText: string;
  surface: string;
  accentSoft: string;
  rowBorder: string;
  groupBg: string;
  groupText: string;
  twist: string;
  noteEmpty: string;
  noteHoverBg: string;
  noteEmptyHover: string;
  selectedRow: string;
  hoverRow: string;
  unassignedAccent: string;
  unassignedText: string;
  unassignedBg: string;
  unknownText: string;
  unknownBg: string;
  overdue: string;
  overdueBg: string;
  milestoneSidebar: string;
  milestoneSidebarText: string;
  milestoneBand: string;
  warningText: string;
  overlay: string;
  modalShadow: string;
  menuShadow: string;
  onAccent: string;
  onAccentDark: string;
};

export type AppPalette = {
  css: CssPalette;
  chart: ChartPalette;
};

const LIGHT: AppPalette = {
  css: {
    bg: "#ffffff",
    panel: "#f8f9fb",
    border: "#e3e6eb",
    text: "#1f2937",
    textSecondary: "#697586",
    accent: "#4c5fd5",
    today: "#e2542a",
    danger: "#c4351a",
    dangerOn: "#ffffff",
    dangerText: "#c4351a",
    surface: "#ffffff",
    accentSoft: "#dce3fb",
    rowBorder: "#f0f1f4",
    groupBg: "#f3f5f8",
    groupText: "#4b5568",
    twist: "#6b7280",
    noteEmpty: "#c5cad3",
    noteHoverBg: "#e8ebf4",
    noteEmptyHover: "#9aa3b2",
    selectedRow: "#dce3fb",
    hoverRow: "#eef2fc",
    unassignedAccent: "#d4920a",
    unassignedText: "#8a5a00",
    unassignedBg: "#fff4d6",
    unknownText: "#5b3f91",
    unknownBg: "#efe8fb",
    overdue: "#c4351a",
    overdueBg: "#fde8e4",
    milestoneSidebar: "#f4f1ea",
    milestoneSidebarText: "#111827",
    milestoneBand: "#fbf9f4",
    warningText: "#8a5a00",
    overlay: "rgba(16, 24, 40, 0.4)",
    modalShadow: "rgba(16, 24, 40, 0.2)",
    menuShadow: "rgba(0, 0, 0, 0.12)",
    onAccent: "#ffffff",
    onAccentDark: "#12152b",
  },
  chart: {
    summaryCovered: "#8A94A6",
    summaryGap: "#D5DBE3",
    headerBorder: "#E3E6EB",
    monthGrid: "#C7CCD6",
    textPrimary: "#1F2937",
    textSecondary: "#697586",
    nonWorking: "#F4F5F8",
    gridMonday: "#9AA5B4",
    gridWeekday: "#E3E6EB",
    gridBodyMonday: "#D8DCE3",
    gridBodyWeekday: "#EDEFF3",
    gridMonth: "#DDE1E7",
    rowBorder: "#F0F1F4",
    categoryRow: "#F8F9FB",
    groupRow: "#F3F5F8",
    linkOk: "#8A94A6",
    linkBroken: "#C4351A",
    linkTargetStroke: "#0C7C86",
    lightning: "#E07B20",
    resizeHandle: "#4C5FD5",
    dragDateFill: "#FFFFFF",
    dragDateStroke: "#5C6B82",
    milestoneDiamond: "#111827",
    milestoneDiamondStroke: "#FFFFFF",
    milestoneBandBorder: "#E3E6EB",
    unassignedStroke: "#C48A1A",
    unknownStroke: "#7B5EA7",
    unassignedCap: "#E0A020",
    unknownCap: "#7B5EA7",
    overrunOverlay: "rgba(196, 53, 26, 0.45)",
    statusNotStarted: { bg: "#E2E6ED", fill: null, border: "#7d8799" },
    statusInProgress: { bg: "#DEE3FB", fill: "#4C5FD5", border: "#4C5FD5" },
    statusDone: { bg: "#247A55", fill: null, border: "#1F6B4A" },
    overdueInProgress: { bg: "#F8D0C8", fill: "#E2542A", border: "#C4351A" },
    overdueOther: { bg: "#F8D0C8", fill: null, border: "#C4351A" },
    exportBg: "#ffffff",
    dependencyMarkerOk: "#8A94A6",
    dependencyMarkerBroken: "#C4351A",
    barLabelMuted: "#1F2937",
    barLabelOnFill: "#FFFFFF",
  },
};

const DARK: AppPalette = {
  css: {
    bg: "#1c1f26",
    panel: "#262a33",
    border: "#3a4050",
    text: "#e6e8ee",
    textSecondary: "#a8b0bf",
    accent: "#7b8cff",
    today: "#f07050",
    danger: "#c4351a",
    dangerOn: "#ffffff",
    dangerText: "#ff9a82",
    surface: "#23272f",
    accentSoft: "#343b52",
    rowBorder: "#323844",
    groupBg: "#2a2f3a",
    groupText: "#b8c0cf",
    twist: "#8a94a6",
    noteEmpty: "#5c6578",
    noteHoverBg: "#323844",
    noteEmptyHover: "#7a8496",
    selectedRow: "#343b52",
    hoverRow: "#2a3148",
    unassignedAccent: "#d4920a",
    unassignedText: "#e8c060",
    unassignedBg: "#3d3520",
    unknownText: "#c4a8e8",
    unknownBg: "#352a48",
    overdue: "#f07050",
    overdueBg: "#3d2824",
    milestoneSidebar: "#2a2830",
    milestoneSidebarText: "#e6e8ee",
    milestoneBand: "#252830",
    warningText: "#e8c060",
    overlay: "rgba(0, 0, 0, 0.55)",
    modalShadow: "rgba(0, 0, 0, 0.45)",
    menuShadow: "rgba(0, 0, 0, 0.35)",
    onAccent: "#12152b",
    onAccentDark: "#12152b",
  },
  chart: {
    summaryCovered: "#6b7588",
    summaryGap: "#3a4050",
    headerBorder: "#3a4050",
    monthGrid: "#5c6578",
    textPrimary: "#e6e8ee",
    textSecondary: "#a8b0bf",
    nonWorking: "#2a2f3a",
    gridMonday: "#6b7588",
    gridWeekday: "#3a4050",
    gridBodyMonday: "#454b5c",
    gridBodyWeekday: "#323844",
    gridMonth: "#454b5c",
    rowBorder: "#323844",
    categoryRow: "#262a33",
    groupRow: "#2a2f3a",
    linkOk: "#8a94a6",
    linkBroken: "#f07050",
    linkTargetStroke: "#5ee0e0",
    lightning: "#f0a040",
    resizeHandle: "#7b8cff",
    dragDateFill: "#3a4254",
    dragDateStroke: "#c5cad3",
    milestoneDiamond: "#e6e8ee",
    milestoneDiamondStroke: "#1c1f26",
    milestoneBandBorder: "#3a4050",
    unassignedStroke: "#e8c060",
    unknownStroke: "#a888d8",
    unassignedCap: "#e8c060",
    unknownCap: "#a888d8",
    overrunOverlay: "rgba(240, 112, 80, 0.45)",
    statusNotStarted: { bg: "#454b5c", fill: null, border: "#8a94a6" },
    statusInProgress: { bg: "#2e3344", fill: "#7b8cff", border: "#7b8cff" },
    statusDone: { bg: "#3d9a72", fill: null, border: "#4cb088" },
    overdueInProgress: { bg: "#4a302c", fill: "#f07050", border: "#f07050" },
    overdueOther: { bg: "#4a302c", fill: null, border: "#f07050" },
    exportBg: "#1c1f26",
    dependencyMarkerOk: "#8a94a6",
    dependencyMarkerBroken: "#f07050",
    barLabelMuted: "#E6E8EE",
    barLabelOnFill: "#12152B",
  },
};

export function paletteFor(scheme: ResolvedColorScheme): AppPalette {
  return scheme === "dark" ? DARK : LIGHT;
}

export function applyCssPalette(palette: AppPalette): void {
  const root = document.documentElement;
  const c = palette.css;
  root.style.setProperty("--radius-sm", "4px");
  root.style.setProperty("--radius-md", "6px");
  root.style.setProperty("--radius-lg", "8px");
  root.style.setProperty("--elevation-menu", `0 8px 24px ${c.menuShadow}`);
  root.style.setProperty("--elevation-modal", `0 8px 24px ${c.modalShadow}`);
  root.style.setProperty("--bg", c.bg);
  root.style.setProperty("--panel", c.panel);
  root.style.setProperty("--border", c.border);
  root.style.setProperty("--text", c.text);
  root.style.setProperty("--text-secondary", c.textSecondary);
  root.style.setProperty("--accent", c.accent);
  root.style.setProperty("--today", c.today);
  root.style.setProperty("--danger", c.danger);
  root.style.setProperty("--danger-on", c.dangerOn);
  root.style.setProperty("--danger-text", c.dangerText);
  root.style.setProperty("--surface", c.surface);
  root.style.setProperty("--accent-soft", c.accentSoft);
  root.style.setProperty("--row-border", c.rowBorder);
  root.style.setProperty("--group-bg", c.groupBg);
  root.style.setProperty("--group-text", c.groupText);
  root.style.setProperty("--twist", c.twist);
  root.style.setProperty("--note-empty", c.noteEmpty);
  root.style.setProperty("--note-hover-bg", c.noteHoverBg);
  root.style.setProperty("--note-empty-hover", c.noteEmptyHover);
  root.style.setProperty("--selected-row", c.selectedRow);
  root.style.setProperty("--hover-row", c.hoverRow);
  root.style.setProperty("--unassigned-accent", c.unassignedAccent);
  root.style.setProperty("--unassigned-text", c.unassignedText);
  root.style.setProperty("--unassigned-bg", c.unassignedBg);
  root.style.setProperty("--unknown-text", c.unknownText);
  root.style.setProperty("--unknown-bg", c.unknownBg);
  root.style.setProperty("--overdue", c.overdue);
  root.style.setProperty("--overdue-bg", c.overdueBg);
  root.style.setProperty("--milestone-sidebar", c.milestoneSidebar);
  root.style.setProperty("--milestone-sidebar-text", c.milestoneSidebarText);
  root.style.setProperty("--milestone-band", c.milestoneBand);
  root.style.setProperty("--warning-text", c.warningText);
  root.style.setProperty("--overlay", c.overlay);
  root.style.setProperty("--modal-shadow", c.modalShadow);
  root.style.setProperty("--menu-shadow", c.menuShadow);
  root.style.setProperty("--on-accent", c.onAccent);
  root.style.setProperty("--on-accent-dark", c.onAccentDark);
}
