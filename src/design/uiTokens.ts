import type { ResolvedColorScheme } from "../model/palette";

/** Layout / motion / typography tokens (scheme-independent unless noted). */
export type UiTokenSet = {
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusPill: string;
  radiusCard: string;
  radiusDialog: string;
  spaceXs: string;
  spaceSm: string;
  spaceMd: string;
  spaceLg: string;
  spaceMainGap: string;
  fontFamilyUi: string;
  fontSizeCaption: string;
  fontSizeBody: string;
  fontSizeTitle: string;
  fontWeightNormal: string;
  fontWeightSemibold: string;
  fontWeightBold: string;
  lineHeightTight: string;
  lineHeightBody: string;
  motionDurationFast: string;
  motionDurationNormal: string;
  motionEaseStandard: string;
  borderWidthHairline: string;
  borderWidthFocus: string;
  elevationToolbar: string;
  elevationCard: string;
  elevationModal: string;
  elevationMenu: string;
  toolbarBg: string;
  toolbarFg: string;
  toolbarBtnBg: string;
  toolbarBtnFg: string;
  toolbarBtnHoverBg: string;
  timelineSurfaceBg: string;
  timelineHeaderBorder: string;
  settingsNavBg: string;
  rowStripe: string;
};

const LIGHT_CHROME: UiTokenSet = {
  radiusSm: "8px",
  radiusMd: "12px",
  radiusLg: "16px",
  radiusPill: "999px",
  radiusCard: "calc(14px * var(--s))",
  radiusDialog: "calc(18px * var(--s))",
  spaceXs: "calc(4px * var(--s))",
  spaceSm: "calc(8px * var(--s))",
  spaceMd: "calc(10px * var(--s))",
  spaceLg: "calc(14px * var(--s))",
  spaceMainGap: "calc(10px * var(--s))",
  fontFamilyUi:
    'ui-rounded, "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif',
  fontSizeCaption: "calc(10px * var(--s))",
  fontSizeBody: "calc(12px * var(--s))",
  fontSizeTitle: "calc(13px * var(--s))",
  fontWeightNormal: "400",
  fontWeightSemibold: "600",
  fontWeightBold: "700",
  lineHeightTight: "1.25",
  lineHeightBody: "1.45",
  motionDurationFast: "120ms",
  motionDurationNormal: "200ms",
  motionEaseStandard: "cubic-bezier(0.4, 0, 0.2, 1)",
  borderWidthHairline: "1px",
  borderWidthFocus: "2px",
  elevationToolbar: "0 8px 32px rgba(0, 0, 0, 0.25)",
  elevationCard: "0 4px 24px rgba(0, 0, 0, 0.12)",
  elevationModal: "0 24px 64px rgba(0, 0, 0, 0.2)",
  elevationMenu: "",
  toolbarBg: "#1a1a1a",
  toolbarFg: "#f5f5f5",
  toolbarBtnBg: "#333333",
  toolbarBtnFg: "#f0f0f0",
  toolbarBtnHoverBg: "#444444",
  timelineSurfaceBg: "#ffffff",
  timelineHeaderBorder: "#e5e7eb",
  settingsNavBg: "#f5f5f7",
  rowStripe: "rgba(0, 0, 0, 0.025)",
};

const DARK_CHROME: UiTokenSet = {
  ...LIGHT_CHROME,
  elevationToolbar:
    "0 8px 32px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.04)",
  elevationCard: "0 8px 28px rgba(0, 0, 0, 0.45)",
  elevationModal: "0 24px 64px rgba(0, 0, 0, 0.55)",
  toolbarBg: "#2a2b33",
  toolbarBtnBg: "#3a3b44",
  toolbarBtnHoverBg: "#454652",
  timelineSurfaceBg: "var(--surface)",
  timelineHeaderBorder: "var(--border)",
  settingsNavBg: "var(--panel)",
  rowStripe: "rgba(255, 255, 255, 0.03)",
};

export function uiTokensFor(scheme: ResolvedColorScheme): UiTokenSet {
  return scheme === "dark" ? DARK_CHROME : LIGHT_CHROME;
}

/** CSS custom properties for Issue #449 phase 3 — single source applied with palette. */
export function uiTokenCssProperties(
  scheme: ResolvedColorScheme,
  menuShadow: string,
): Record<string, string> {
  const t = uiTokensFor(scheme);
  return {
    "--radius-sm": t.radiusSm,
    "--radius-md": t.radiusMd,
    "--radius-lg": t.radiusLg,
    "--radius-pill": t.radiusPill,
    "--radius-card": t.radiusCard,
    "--radius-dialog": t.radiusDialog,
    "--space-xs": t.spaceXs,
    "--space-sm": t.spaceSm,
    "--space-md": t.spaceMd,
    "--space-lg": t.spaceLg,
    "--space-main-gap": t.spaceMainGap,
    "--font-family-ui": t.fontFamilyUi,
    "--font-size-caption": t.fontSizeCaption,
    "--font-size-body": t.fontSizeBody,
    "--font-size-title": t.fontSizeTitle,
    "--font-weight-normal": t.fontWeightNormal,
    "--font-weight-semibold": t.fontWeightSemibold,
    "--font-weight-bold": t.fontWeightBold,
    "--line-height-tight": t.lineHeightTight,
    "--line-height-body": t.lineHeightBody,
    "--motion-duration-fast": t.motionDurationFast,
    "--motion-duration-normal": t.motionDurationNormal,
    "--motion-ease-standard": t.motionEaseStandard,
    "--border-width-hairline": t.borderWidthHairline,
    "--border-width-focus": t.borderWidthFocus,
    "--elevation-toolbar": t.elevationToolbar,
    "--elevation-card": t.elevationCard,
    "--elevation-modal": t.elevationModal,
    "--elevation-menu": `0 8px 24px ${menuShadow}`,
    "--toolbar-bg": t.toolbarBg,
    "--toolbar-fg": t.toolbarFg,
    "--toolbar-btn-bg": t.toolbarBtnBg,
    "--toolbar-btn-fg": t.toolbarBtnFg,
    "--toolbar-btn-hover-bg": t.toolbarBtnHoverBg,
    "--timeline-surface-bg": t.timelineSurfaceBg,
    "--timeline-header-border": t.timelineHeaderBorder,
    "--settings-nav-bg": t.settingsNavBg,
    "--row-stripe": t.rowStripe,
  };
}
