import { useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import packageJson from "../../package.json";
import type { AppMembersSettings } from "../model/memberAppData";
import {
  catalogIdFromFilename,
  pickMembersJsonFile,
} from "../model/memberAppData";
import {
  calendarLabelFromFilename,
  pickCalendarJsonFile,
} from "../model/calendarAppData";
import {
  formatCalendarValidationErrors,
  validateCalendar,
} from "../model/validateCalendar";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "../model/validateMembers";

function settingsDesktopOnly(): boolean {
  return isTauri() || import.meta.env.MODE === "manual-screenshot";
}
import { usesCommandKey } from "../model/shortcuts";
import { ModalDialog } from "./ModalDialog";
import { SettingsChangelogHistory } from "./SettingsChangelogHistory";
import {
  COLOR_SCHEME_OPTIONS,
  parseColorSchemePreference,
  writeColorSchemePreference,
  type ColorSchemePreference,
} from "../model/colorScheme";
import {
  DISPLAY_SCALE_OPTIONS,
  parseDisplayScalePreference,
  writeDisplayScalePreference,
  type DisplayScalePreference,
} from "../model/uiScale";
import {
  SIDEBAR_COLUMN_LABELS,
  type RowDensity,
  type SidebarColumnId,
  type SidebarColumnsPreference,
  writeRowDensity,
  writeShowLightning,
  writeSidebarColumns,
} from "../model/viewPreferences";
import {
  defaultJsonSkillTools,
  fetchJsonSkillHomeDirs,
  installJsonSkills,
  pickJsonSkillFolder,
  uninstallJsonSkills,
  type JsonSkillScope,
  type JsonSkillTools,
} from "../model/jsonSkills";
import {
  installReadScreenSkill,
  uninstallReadScreenSkill,
} from "../model/readScreenSkill";
import { normalizeVersionLabel } from "../model/releaseNotes";
import { fetchMcpConfigJson } from "../model/mcpRegistration";
import { UpdateOfferNotice } from "./UpdateOfferNotice";
import type { ApplicationUpdateUiPhase } from "../model/appUpdateUi";
import type { WorkspaceWindowBinding } from "../model/workspaceTypes";
import { workspaceFileDisplayLabel } from "../model/workspaceDisplay";
import {
  workspaceBindingSummary,
  workspaceCalendarError,
  workspaceMemberError,
} from "../model/workspaceLoad";

function formatAppVersionLine(raw: string): string {
  const normalized = normalizeVersionLabel(raw);
  return normalized
    ? `バージョン ${normalized}`
    : "バージョンを取得できませんでした";
}

let cachedAppVersionLine: string | null = null;
let appVersionFetchPromise: Promise<void> | null = null;

if (!settingsDesktopOnly()) {
  cachedAppVersionLine = formatAppVersionLine(packageJson.version);
}

function fetchAppVersionLineIfNeeded(): Promise<void> {
  if (cachedAppVersionLine !== null) return Promise.resolve();
  if (!settingsDesktopOnly()) {
    cachedAppVersionLine = formatAppVersionLine(packageJson.version);
    return Promise.resolve();
  }
  if (appVersionFetchPromise) return appVersionFetchPromise;
  appVersionFetchPromise = getVersion()
    .then((version) => {
      cachedAppVersionLine = formatAppVersionLine(version);
    })
    .catch(() => {
      cachedAppVersionLine = "バージョンを取得できませんでした";
    })
    .finally(() => {
      appVersionFetchPromise = null;
    });
  return appVersionFetchPromise;
}

type SettingsDialogProps = {
  open: boolean;
  settings: AppMembersSettings;
  selectedCatalogLabel: string | null;
  calendarLabel: string | null;
  calendarError?: string | null;
  displayScalePreference: DisplayScalePreference;
  onDisplayScaleChange: (preference: DisplayScalePreference) => void;
  colorSchemePreference: ColorSchemePreference;
  onColorSchemeChange: (preference: ColorSchemePreference) => void;
  rowDensity: RowDensity;
  onRowDensityChange: (value: RowDensity) => void;
  showLightningLine: boolean;
  onShowLightningLineChange: (value: boolean) => void;
  sidebarColumns: SidebarColumnsPreference;
  onSidebarColumnsChange: (value: SidebarColumnsPreference) => void;
  initialSection?: SettingsSection;
  onClose: () => void;
  onImport: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  onSelectCatalog: (catalogId: string | null) => Promise<void>;
  onDeleteCatalog: (catalogId: string) => Promise<void>;
  onImportCalendar: (label: string, contents: string) => Promise<void>;
  onDeleteCalendar: () => Promise<void>;
  autoUpdateEnabled?: boolean;
  onAutoUpdateChange?: (enabled: boolean) => void;
  onCheckForUpdates?: () => void;
  updateUiPhase?: ApplicationUpdateUiPhase;
  updateUiMessage?: string | null;
  onUpdateLater?: () => void;
  onUpdateInstall?: () => void;
  updateOfferLiveAnnouncementKey?: string;
  registerOfferAnnouncement?: (key: string) => boolean;
  markOfferAnnounced?: (key: string) => void;
  showBetaInstallerSave?: boolean;
  onSaveBetaInstaller?: () => void;
  betaInstallerStatusLine?: string | null;
  storeDistribution?: boolean;
  workspaceBinding?: WorkspaceWindowBinding | null;
};

function betaInstallerPlatform(): "windows" | "linux" | null {
  if (!settingsDesktopOnly()) return null;
  const ua = navigator.userAgent;
  if (/Win/i.test(ua)) return "windows";
  if (/Linux/i.test(ua)) return "linux";
  return null;
}

export type SettingsSection =
  | "display"
  | "members"
  | "calendar"
  | "updates"
  | "mcp"
  | "jsonSkills";

export function SettingsDialog({
  open,
  settings,
  selectedCatalogLabel,
  calendarLabel,
  calendarError = null,
  displayScalePreference,
  onDisplayScaleChange,
  colorSchemePreference,
  onColorSchemeChange,
  rowDensity,
  onRowDensityChange,
  showLightningLine,
  onShowLightningLineChange,
  sidebarColumns,
  onSidebarColumnsChange,
  initialSection = "display",
  onClose,
  onImport,
  onSelectCatalog,
  onDeleteCatalog,
  onImportCalendar,
  onDeleteCalendar,
  autoUpdateEnabled = false,
  onAutoUpdateChange,
  onCheckForUpdates,
  updateUiPhase = "idle",
  updateUiMessage = null,
  onUpdateLater,
  onUpdateInstall,
  updateOfferLiveAnnouncementKey,
  registerOfferAnnouncement,
  markOfferAnnounced,
  storeDistribution = false,
  showBetaInstallerSave = betaInstallerPlatform() != null && !storeDistribution,
  onSaveBetaInstaller,
  betaInstallerStatusLine = null,
  workspaceBinding = null,
}: SettingsDialogProps) {
  const displayScaleShortcut = usesCommandKey(
    navigator.platform || navigator.userAgent,
  )
    ? "⌘+ と ⌘−"
    : "Ctrl++ と Ctrl+-";
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const workspaceMembersNoteRef = useRef<HTMLParagraphElement>(null);
  const workspaceCalendarNoteRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (open) setSection(initialSection);
  }, [initialSection, open]);

  const workspaceNoteFocusRef =
    section === "members"
      ? workspaceMembersNoteRef
      : section === "calendar"
        ? workspaceCalendarNoteRef
        : undefined;

  useEffect(() => {
    setMessage(null);
    setMcpPanelMessage(null);
  }, [section]);

  useEffect(() => {
    if (!open || section !== "mcp" || !settingsDesktopOnly()) return;
    void fetchMcpConfigJson().then((json) => {
      setMcpConfig(json ?? "");
    });
  }, [open, section]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mcpPanelMessage, setMcpPanelMessage] = useState<{
    text: string;
    kind: "status" | "alert";
  } | null>(null);
  const [mcpConfig, setMcpConfig] = useState("");
  const [readScreenTools, setReadScreenTools] = useState<JsonSkillTools>("both");
  const [readScreenInstalledPaths, setReadScreenInstalledPaths] = useState<
    string[] | null
  >(null);
  const [readScreenExecutablePath, setReadScreenExecutablePath] = useState<
    string | null
  >(null);
  const [readScreenRemovedPaths, setReadScreenRemovedPaths] = useState<
    string[] | null
  >(null);
  const [confirmReadScreenReplace, setConfirmReadScreenReplace] = useState(false);
  const [pendingReadScreenExisting, setPendingReadScreenExisting] = useState<
    string[] | null
  >(null);
  const [confirmReadScreenUninstall, setConfirmReadScreenUninstall] =
    useState(false);
  const readScreenToolsTouched = useRef(false);
  const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(
    null,
  );
  const [pendingImport, setPendingImport] = useState<{
    catalogId: string;
    contents: string;
  } | null>(null);
  const [confirmCalendarOverwrite, setConfirmCalendarOverwrite] = useState(false);
  const [pendingCalendarImport, setPendingCalendarImport] = useState<{
    label: string;
    contents: string;
  } | null>(null);
  const [jsonSkillTools, setJsonSkillTools] = useState<JsonSkillTools>("both");
  const [jsonSkillScope, setJsonSkillScope] = useState<JsonSkillScope>("user");
  const [jsonSkillProjectFolder, setJsonSkillProjectFolder] = useState<
    string | null
  >(null);
  const [jsonSkillInstalledPaths, setJsonSkillInstalledPaths] = useState<
    string[] | null
  >(null);
  const [jsonSkillClaudeShadows, setJsonSkillClaudeShadows] = useState<
    string[] | null
  >(null);
  const [confirmJsonSkillReplace, setConfirmJsonSkillReplace] = useState(false);
  const [pendingJsonSkillExisting, setPendingJsonSkillExisting] = useState<
    string[] | null
  >(null);
  const [confirmJsonSkillUninstall, setConfirmJsonSkillUninstall] =
    useState(false);
  const [jsonSkillRemovedPaths, setJsonSkillRemovedPaths] = useState<
    string[] | null
  >(null);
  const jsonSkillToolsTouched = useRef(false);
  const [appVersionLine, setAppVersionLine] = useState<string | null>(
    () => cachedAppVersionLine,
  );

  useEffect(() => {
    if (!open) return;
    if (cachedAppVersionLine !== null) {
      setAppVersionLine(cachedAppVersionLine);
      return;
    }
    let cancelled = false;
    void fetchAppVersionLineIfNeeded().then(() => {
      if (!cancelled && cachedAppVersionLine !== null) {
        setAppVersionLine(cachedAppVersionLine);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      jsonSkillToolsTouched.current = false;
      readScreenToolsTouched.current = false;
      return;
    }
    if (!settingsDesktopOnly()) return;
    let cancelled = false;
    void fetchJsonSkillHomeDirs()
      .then((homeDirs) => {
        if (cancelled || jsonSkillToolsTouched.current) return;
        setJsonSkillTools(defaultJsonSkillTools(homeDirs));
        if (!readScreenToolsTouched.current) {
          setReadScreenTools(defaultJsonSkillTools(homeDirs));
        }
      })
      .catch(() => {
        if (!cancelled && !jsonSkillToolsTouched.current) {
          setJsonSkillTools("both");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const chooseJsonSkillTools = (tools: JsonSkillTools) => {
    jsonSkillToolsTouched.current = true;
    setJsonSkillTools(tools);
  };

  if (!open) return null;

  const runAction = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : failure);
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (
    catalogId: string,
    contents: string,
    overwrite: boolean,
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      await onImport(catalogId, contents, overwrite);
      setMessage(`「${catalogId}」を取り込みました。`);
      setConfirmOverwriteId(null);
      setPendingImport(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "取り込みに失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = async () => {
    let pick: Awaited<ReturnType<typeof pickMembersJsonFile>>;
    try {
      pick = await pickMembersJsonFile();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "取り込みに失敗しました。",
      );
      return;
    }
    if (!pick) return;
    let data: unknown;
    try {
      data = JSON.parse(pick.contents.replace(/^\uFEFF/, ""));
    } catch {
      setMessage("JSON の形式が正しくありません。");
      return;
    }
    const parsed = validateMembers(data);
    if (!parsed.ok) {
      setMessage(formatMembersValidationErrors(parsed.errors));
      return;
    }
    const catalogId = catalogIdFromFilename(pick.name);
    const exists = settings.catalogs.some((c) => c.id === catalogId);
    if (exists) {
      setPendingImport({ catalogId, contents: pick.contents });
      setConfirmOverwriteId(catalogId);
      return;
    }
    await runImport(catalogId, pick.contents, false);
  };

  const runCalendarImport = async (label: string, contents: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await onImportCalendar(label, contents);
      setMessage(`「${label}」を取り込みました。`);
      setConfirmCalendarOverwrite(false);
      setPendingCalendarImport(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "取り込みに失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCalendarImportClick = async () => {
    let pick: Awaited<ReturnType<typeof pickCalendarJsonFile>>;
    try {
      pick = await pickCalendarJsonFile();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "取り込みに失敗しました。",
      );
      return;
    }
    if (!pick) return;
    let data: unknown;
    try {
      data = JSON.parse(pick.contents.replace(/^\uFEFF/, ""));
    } catch {
      setMessage("JSON の形式が正しくありません。");
      return;
    }
    const parsed = validateCalendar(data);
    if (!parsed.ok) {
      setMessage(formatCalendarValidationErrors(parsed.errors));
      return;
    }
    const label = calendarLabelFromFilename(pick.name);
    if (calendarLabel != null) {
      setPendingCalendarImport({ label, contents: pick.contents });
      setConfirmCalendarOverwrite(true);
      return;
    }
    await runCalendarImport(label, pick.contents);
  };

  const runJsonSkillInstall = async (replace: boolean) => {
    if (jsonSkillScope === "project" && !jsonSkillProjectFolder) {
      setMessage("プロジェクトのフォルダを選んでください。");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await installJsonSkills({
        tools: jsonSkillTools,
        scope: jsonSkillScope,
        projectFolder: jsonSkillProjectFolder,
        replace,
      });
      if (!replace && result.existingPaths.length > 0) {
        setPendingJsonSkillExisting(result.existingPaths);
        setConfirmJsonSkillReplace(true);
        return;
      }
      setJsonSkillInstalledPaths(result.installedPaths);
      setJsonSkillRemovedPaths(null);
      setJsonSkillClaudeShadows(result.claudeUserShadows);
      setConfirmJsonSkillReplace(false);
      setPendingJsonSkillExisting(null);
      setMessage("JSON作成スキルを置きました。");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "スキルを置けませんでした。",
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePickJsonSkillFolder = async () => {
    if (!settingsDesktopOnly()) return;
    setBusy(true);
    setMessage(null);
    try {
      const picked = await pickJsonSkillFolder();
      if (picked) setJsonSkillProjectFolder(picked);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "フォルダを選べませんでした。",
      );
    } finally {
      setBusy(false);
    }
  };

  const requestJsonSkillUninstall = () => {
    if (jsonSkillScope === "project" && !jsonSkillProjectFolder) {
      setMessage("プロジェクトのフォルダを選んでください。");
      return;
    }
    setMessage(null);
    setConfirmJsonSkillUninstall(true);
  };

  const chooseReadScreenTools = (tools: JsonSkillTools) => {
    readScreenToolsTouched.current = true;
    setReadScreenTools(tools);
  };

  const runReadScreenInstall = async (replace: boolean) => {
    setBusy(true);
    setMcpPanelMessage(null);
    try {
      const result = await installReadScreenSkill({
        tools: readScreenTools,
        replace,
      });
      if (!replace && result.existingPaths.length > 0) {
        setPendingReadScreenExisting(result.existingPaths);
        setConfirmReadScreenReplace(true);
        return;
      }
      setReadScreenInstalledPaths(result.installedPaths);
      setReadScreenExecutablePath(result.executablePath);
      setReadScreenRemovedPaths(null);
      setConfirmReadScreenReplace(false);
      setPendingReadScreenExisting(null);
      setMcpPanelMessage({
        text: "画面の状態を読むスキルを置きました。",
        kind: "status",
      });
    } catch (error) {
      setMcpPanelMessage({
        text:
          error instanceof Error ? error.message : "スキルを置けませんでした。",
        kind: "alert",
      });
    } finally {
      setBusy(false);
    }
  };

  const requestReadScreenUninstall = () => {
    setMcpPanelMessage(null);
    setConfirmReadScreenUninstall(true);
  };

  const runReadScreenUninstall = async () => {
    setBusy(true);
    setMcpPanelMessage(null);
    try {
      const result = await uninstallReadScreenSkill({ tools: readScreenTools });
      setReadScreenRemovedPaths(result.removedPaths);
      setReadScreenInstalledPaths((current) =>
        current?.filter((path) => !result.removedPaths.includes(path)) ?? null,
      );
      setConfirmReadScreenUninstall(false);
      if (result.removedPaths.length === 0) {
        setMcpPanelMessage({
          text: "選んだ場所に read-screen は見つかりませんでした。",
          kind: "status",
        });
        return;
      }
      setReadScreenExecutablePath(null);
      setMcpPanelMessage({
        text: "画面の状態を読むスキルを外しました。",
        kind: "status",
      });
    } catch (error) {
      setMcpPanelMessage({
        text:
          error instanceof Error ? error.message : "スキルを外せませんでした。",
        kind: "alert",
      });
    } finally {
      setBusy(false);
    }
  };

  const runJsonSkillUninstall = async () => {
    if (jsonSkillScope === "project" && !jsonSkillProjectFolder) {
      setConfirmJsonSkillUninstall(false);
      setMessage("プロジェクトのフォルダを選んでください。");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await uninstallJsonSkills({
        tools: jsonSkillTools,
        scope: jsonSkillScope,
        projectFolder: jsonSkillProjectFolder,
      });
      setJsonSkillRemovedPaths(result.removedPaths);
      setJsonSkillInstalledPaths((current) =>
        current?.filter((path) => !result.removedPaths.includes(path)) ?? null,
      );
      setJsonSkillClaudeShadows((current) =>
        current?.filter((path) => !result.removedPaths.includes(path)) ?? null,
      );
      setConfirmJsonSkillUninstall(false);
      if (result.removedPaths.length === 0) {
        setMessage("選んだ場所に JSON 作成スキルは見つかりませんでした。");
        return;
      }
      setMessage("JSON作成スキルを外しました。");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "スキルを外せませんでした。",
      );
    } finally {
      setBusy(false);
    }
  };

  const messageIsError =
    message != null &&
    (message.includes("できません") ||
      message.includes("失敗") ||
      message.includes("正しく") ||
      message.includes("選んで") ||
      message.includes("置けません") ||
      message.includes("外せません") ||
      message.includes("不正") ||
      message.includes("見つかりません"));

  return (
    <ModalDialog
      title="設定"
      onClose={onClose}
      initialFocusRef={
        workspaceBinding && (section === "members" || section === "calendar")
          ? workspaceNoteFocusRef
          : undefined
      }
      className={
        section === "updates"
          ? "modal settings-dialog settings-dialog--updates"
          : "modal settings-dialog"
      }
    >
        <div className="settings-layout">
          <nav className="settings-nav" aria-label="設定セクション">
            <button
              type="button"
              className={section === "display" ? "active" : undefined}
              aria-current={section === "display" ? "true" : undefined}
              onClick={() => setSection("display")}
            >
              表示
            </button>
            <button
              type="button"
              className={section === "members" ? "active" : undefined}
              aria-current={section === "members" ? "true" : undefined}
              onClick={() => setSection("members")}
            >
              メンバー
            </button>
            <button
              type="button"
              className={section === "calendar" ? "active" : undefined}
              aria-current={section === "calendar" ? "true" : undefined}
              onClick={() => setSection("calendar")}
            >
              稼働日
            </button>
            {settingsDesktopOnly() ? (
              <button
                type="button"
                className={section === "updates" ? "active" : undefined}
                aria-current={section === "updates" ? "true" : undefined}
                onClick={() => setSection("updates")}
              >
                更新
              </button>
            ) : null}
            {settingsDesktopOnly() ? (
              <button
                type="button"
                className={section === "mcp" ? "active" : undefined}
                aria-current={section === "mcp" ? "true" : undefined}
                onClick={() => setSection("mcp")}
              >
                画面の状態を渡す
              </button>
            ) : null}
            <button
              type="button"
              className={section === "jsonSkills" ? "active" : undefined}
              aria-current={section === "jsonSkills" ? "true" : undefined}
              onClick={() => setSection("jsonSkills")}
            >
              JSON作成スキルを置く
            </button>
          </nav>
          <div className="settings-panel">
            {section === "display" ? (
              <>
                <p className="settings-note">
                  文字・行・ボタンの大きさと配色。期間のズーム（日表示・週表示・月表示）とは別です。
                  {displayScaleShortcut} で表示サイズを一段変えます。
                </p>
                <label className="settings-field">
                  <span>表示サイズ</span>
                  <select
                    value={String(displayScalePreference)}
                    disabled={busy}
                    onChange={(e) => {
                      const preference = parseDisplayScalePreference(
                        e.target.value,
                      );
                      writeDisplayScalePreference(preference);
                      onDisplayScaleChange(preference);
                    }}
                  >
                    {DISPLAY_SCALE_OPTIONS.map((option) => (
                      <option
                        key={String(option.value)}
                        value={String(option.value)}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="settings-field">
                  <span>配色</span>
                  <select
                    value={colorSchemePreference}
                    disabled={busy}
                    onChange={(e) => {
                      const preference = parseColorSchemePreference(
                        e.target.value,
                      );
                      writeColorSchemePreference(preference);
                      onColorSchemeChange(preference);
                    }}
                  >
                    {COLOR_SCHEME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="settings-field">
                  <span>行の密度</span>
                  <select
                    value={rowDensity}
                    disabled={busy}
                    onChange={(e) => {
                      const value = e.target.value === "compact" ? "compact" : "comfortable";
                      writeRowDensity(value);
                      onRowDensityChange(value);
                    }}
                  >
                    <option value="comfortable">標準</option>
                    <option value="compact">詰める</option>
                  </select>
                </label>
                <label className="settings-field settings-field-check">
                  <input
                    type="checkbox"
                    checked={showLightningLine}
                    disabled={busy}
                    onChange={(e) => {
                      writeShowLightning(e.target.checked);
                      onShowLightningLineChange(e.target.checked);
                    }}
                  />
                  <span>イナズマ線を表示</span>
                </label>
                <fieldset className="settings-field">
                  <legend>左一覧の列</legend>
                  {(Object.keys(SIDEBAR_COLUMN_LABELS) as SidebarColumnId[]).map(
                    (columnId) => (
                      <label key={columnId} className="settings-field-check">
                        <input
                          type="checkbox"
                          checked={sidebarColumns[columnId]}
                          disabled={busy}
                          onChange={(e) => {
                            const next = {
                              ...sidebarColumns,
                              [columnId]: e.target.checked,
                            };
                            writeSidebarColumns(next);
                            onSidebarColumnsChange(next);
                          }}
                        />
                        <span>{SIDEBAR_COLUMN_LABELS[columnId]}</span>
                      </label>
                    ),
                  )}
                </fieldset>
              </>
            ) : null}
            {section === "members" ? (
              <>
                {workspaceBinding ? (
                  <>
                    <p
                      ref={workspaceMembersNoteRef}
                      className="settings-note"
                      tabIndex={-1}
                    >
                      {workspaceMemberError(workspaceBinding.members)
                        ? `このウィンドウは設定ファイル ${workspaceFileDisplayLabel(workspaceBinding.workspacePath)} で開いています。メンバーはここでは変更できません。`
                        : `このウィンドウは設定ファイル ${workspaceFileDisplayLabel(workspaceBinding.workspacePath)} で開いています。メンバーは設定ファイルの指定どおり表示します。ここでは変更できません。`}
                    </p>
                    <p
                      className="settings-current"
                      title={
                        workspaceBinding.resolved.membersPath ??
                        workspaceBinding.workspacePath
                      }
                    >
                      使用中: {workspaceBindingSummary(workspaceBinding).membersLabel}
                    </p>
                    {workspaceMemberError(workspaceBinding.members) ? (
                      <p className="settings-message" role="alert">
                        {workspaceMemberError(workspaceBinding.members)} 担当はメンバー不明のままです。
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                <p className="settings-note">
                  メンバー JSON をアプリデータへ取り込み、表示に使うカタログを選びます。スケジュール
                  JSON には含めません。
                </p>
                {selectedCatalogLabel ? (
                  <p className="settings-current">
                    使用中: {selectedCatalogLabel}
                  </p>
                ) : (
                  <p className="settings-current">使用中: 未選択</p>
                )}
                <div className="settings-actions">
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={busy}
                    onClick={() => void handleImportClick()}
                  >
                    取り込み…
                  </button>
                </div>
                <ul className="settings-catalog-list">
                  {settings.catalogs.length === 0 ? (
                    <li className="muted">取り込み済みのカタログはありません。</li>
                  ) : (
                    settings.catalogs.map((catalog) => (
                      <li key={catalog.id}>
                        <label className="settings-catalog-row">
                          <input
                            type="radio"
                            name="memberCatalog"
                            checked={settings.selectedCatalogId === catalog.id}
                            disabled={busy}
                            onChange={() =>
                              void runAction(
                                () => onSelectCatalog(catalog.id),
                                "カタログを選択できませんでした。",
                              )
                            }
                          />
                          <span>{catalog.label}</span>
                        </label>
                        <button
                          type="button"
                          className="toolbar-btn"
                          disabled={busy}
                          onClick={() =>
                            void runAction(
                              () => onDeleteCatalog(catalog.id),
                              "カタログを外せませんでした。",
                            )
                          }
                        >
                          外す
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                {settings.catalogs.length > 0 ? (
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={busy || settings.selectedCatalogId == null}
                    onClick={() =>
                      void runAction(
                        () => onSelectCatalog(null),
                        "選択を解除できませんでした。",
                      )
                    }
                  >
                    選択を解除
                  </button>
                ) : null}
                  </>
                )}
              </>
            ) : null}
            {section === "calendar" ? (
              <>
                {workspaceBinding ? (
                  <>
                    <p
                      ref={workspaceCalendarNoteRef}
                      className="settings-note"
                      tabIndex={-1}
                    >
                      {workspaceCalendarError(workspaceBinding.calendar)
                        ? `このウィンドウは設定ファイル ${workspaceFileDisplayLabel(workspaceBinding.workspacePath)} で開いています。稼働日はここでは変更できません。`
                        : `このウィンドウは設定ファイル ${workspaceFileDisplayLabel(workspaceBinding.workspacePath)} で開いています。稼働日は設定ファイルの指定どおり表示します。ここでは変更できません。`}
                    </p>
                    <p
                      className="settings-current"
                      title={
                        workspaceBinding.resolved.calendarPath ??
                        workspaceBinding.workspacePath
                      }
                    >
                      使用中: {workspaceBindingSummary(workspaceBinding).calendarLabel}
                    </p>
                    {workspaceCalendarError(workspaceBinding.calendar) ? (
                      <p className="settings-message" role="alert">
                        {workspaceCalendarError(workspaceBinding.calendar)} 表示は土日のみに戻しています。
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                <p className="settings-note">
                  稼働日カレンダー JSON を1件だけ取り込み、非稼働日をタイムラインに薄く表示します。タスクの移動・期間は暦日のままです。スケジュール
                  JSON には含めません。
                </p>
                {calendarLabel ? (
                  <p className="settings-current">使用中: {calendarLabel}</p>
                ) : (
                  <p className="settings-current">
                    使用中: 未設定（土日を塗る）
                  </p>
                )}
                {calendarError ? (
                  <p className="settings-message">
                    {calendarError} 表示は土日のみに戻しています。
                  </p>
                ) : null}
                <div className="settings-actions">
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={busy}
                    onClick={() => void handleCalendarImportClick()}
                  >
                    取り込み…
                  </button>
                  {calendarLabel ? (
                    <button
                      type="button"
                      className="toolbar-btn"
                      disabled={busy}
                      onClick={() =>
                        void runAction(
                          () => onDeleteCalendar(),
                          "カレンダーを外せませんでした。",
                        )
                      }
                    >
                      外す
                    </button>
                  ) : null}
                </div>
                  </>
                )}
              </>
            ) : null}
            {section === "mcp" && settingsDesktopOnly() ? (
              <>
                <h3 className="settings-changelog-heading">mcp.json に登録する</h3>
                <p className="settings-note">
                  MCP を使える Cursor または Claude 向けです。下の JSON をコピーして、mcp.json
                  に貼ります。渡すのは開いているウィンドウ一覧（open_windows）、差分（schedule_diff）、起点・画面・ファイルの分類（baseline_diffs）、選択中のタスク（selected_task）、編集の選択（selected_tasks）、オンな絞り込みと残るタスク（filtered_tasks）、前面の未保存の置き換え（replace_schedule）です。読み取りは引数を省略すると前面のウィンドウです。別のウィンドウを読むときは一覧の label を window に渡します。置き換えは前面だけです。下のスキルを置いても、この登録は終わりません。スケジュールのウィンドウが開いていないときは渡せません。
                </p>
                <label className="settings-field">
                  <span>mcp.json</span>
                  <textarea
                    className="settings-mcp-json"
                    readOnly
                    spellCheck={false}
                    rows={11}
                    value={mcpConfig}
                  />
                </label>
                <div className="settings-actions">
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={!mcpConfig}
                    onClick={() => {
                      void navigator.clipboard.writeText(mcpConfig).then(
                        () =>
                          setMcpPanelMessage({
                            text: "JSON をコピーしました。",
                            kind: "status",
                          }),
                        () =>
                          setMcpPanelMessage({
                            text: "コピーできませんでした。",
                            kind: "alert",
                          }),
                      );
                    }}
                  >
                    コピー
                  </button>
                </div>
                <h3 className="settings-changelog-heading">MCP を使えないときに渡す</h3>
                <p className="settings-note">
                  MCP を使えない環境では、read-screen スキルがコマンドの呼び方を持ちます。置くときに、このパソコンの実行ファイルの呼び方をスキルへ書き込みます。Windows で実行ファイルが Local AppData 配下のときは、$LOCALAPPDATA から続く1行にします。上の登録を終えても、このスキル置きは終わりません。スケジュール JSON を作る write-schedule など 4 つは「JSON作成スキルを置く」にあります。
                </p>
                <fieldset className="settings-field" disabled={busy}>
                  <legend>置く先</legend>
                  <label className="settings-field-check">
                    <input
                      type="radio"
                      name="readScreenTools"
                      checked={readScreenTools === "cursor"}
                      onChange={() => chooseReadScreenTools("cursor")}
                    />
                    <span>Cursor</span>
                  </label>
                  <label className="settings-field-check">
                    <input
                      type="radio"
                      name="readScreenTools"
                      checked={readScreenTools === "claude"}
                      onChange={() => chooseReadScreenTools("claude")}
                    />
                    <span>Claude Code</span>
                  </label>
                  <label className="settings-field-check">
                    <input
                      type="radio"
                      name="readScreenTools"
                      checked={readScreenTools === "both"}
                      onChange={() => chooseReadScreenTools("both")}
                    />
                    <span>両方（同じ内容を置く）</span>
                  </label>
                </fieldset>
                <div className="settings-actions">
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={busy}
                    onClick={() => void runReadScreenInstall(false)}
                  >
                    置く
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={busy}
                    onClick={() => requestReadScreenUninstall()}
                  >
                    外す
                  </button>
                </div>
                {readScreenRemovedPaths && readScreenRemovedPaths.length > 0 ? (
                  <div className="settings-current">
                    <p>外したパス:</p>
                    <ul className="settings-path-list">
                      {readScreenRemovedPaths.map((path) => (
                        <li key={path}>{path}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {readScreenInstalledPaths && readScreenInstalledPaths.length > 0 ? (
                  <div className="settings-current">
                    <p>置いたパス:</p>
                    <ul className="settings-path-list">
                      {readScreenInstalledPaths.map((path) => (
                        <li key={path}>{path}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {readScreenExecutablePath ? (
                  <p className="settings-note">
                    検出した実行ファイル: {readScreenExecutablePath}
                  </p>
                ) : null}
                {mcpPanelMessage ? (
                  <p
                    className="settings-message"
                    role={mcpPanelMessage.kind === "alert" ? "alert" : "status"}
                  >
                    {mcpPanelMessage.text}
                  </p>
                ) : null}
              </>
            ) : null}
            {section === "updates" && settingsDesktopOnly() ? (
              storeDistribution ? (
                <>
                  <p className="settings-note">
                    Microsoft Store から入れた版は、Windows
                    が更新します。アプリ内では入れ直しを確認しません。
                  </p>
                  <SettingsChangelogHistory active={section === "updates"} />
                </>
              ) : (
              <>
                <p className="settings-note">
                  オンにすると、次回の起動から GitHub Releases
                  の新しい版を確認します。新しい版があれば、入れ直すかを聞きます。初回はオフです。オンにした直後は確認しません。
                </p>
                <label className="settings-field settings-field-check">
                  <input
                    type="checkbox"
                    checked={autoUpdateEnabled}
                    disabled={!onAutoUpdateChange}
                    onChange={(event) =>
                      onAutoUpdateChange?.(event.target.checked)
                    }
                  />
                  <span>起動時に更新を確認する</span>
                </label>
                <div className="settings-actions">
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => onCheckForUpdates?.()}
                  >
                    更新を確認
                  </button>
                </div>
                {updateUiPhase === "checking" ? (
                  <p
                    className="settings-update-status"
                    role="status"
                    aria-live="polite"
                  >
                    確認しています
                  </p>
                ) : null}
                {updateUiPhase === "offer" && updateUiMessage ? (
                  <UpdateOfferNotice
                    embedded
                    message={updateUiMessage}
                    mode="offer"
                    onLater={onUpdateLater}
                    onInstall={onUpdateInstall}
                    liveAnnouncementKey={updateOfferLiveAnnouncementKey}
                    shouldAnnounceOffer={registerOfferAnnouncement}
                    onOfferAnnounced={markOfferAnnounced}
                  />
                ) : null}
                {updateUiPhase === "installing" && updateUiMessage ? (
                  <UpdateOfferNotice
                    embedded
                    message={updateUiMessage}
                    mode="installing"
                  />
                ) : null}
                {updateUiPhase === "info" && updateUiMessage ? (
                  <p
                    className="settings-update-status"
                    role="status"
                    aria-live="polite"
                  >
                    {updateUiMessage}
                  </p>
                ) : null}
                {showBetaInstallerSave ? (
                  <>
                    <p className="settings-note">
                      公開中のベータを、この OS のインストーラとして保存します。
                    </p>
                    <div className="settings-actions">
                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => onSaveBetaInstaller?.()}
                      >
                        インストーラを保存
                      </button>
                    </div>
                    {betaInstallerStatusLine ? (
                      <p className="settings-update-status" role="status">
                        {betaInstallerStatusLine}
                      </p>
                    ) : null}
                  </>
                ) : null}
                <SettingsChangelogHistory active={section === "updates"} />
              </>
              )
            ) : null}
            {section === "jsonSkills" ? (
              <>
                <p className="settings-note">
                  write-schedule、write-members、write-calendar、write-workspace
                  の3つをまとめて置きます。中身はマージしません。git
                  には入れず、置いたパスだけを使います。検証スクリプトは Node.js
                  で動かします。画面の状態を渡す手順は、設定の「画面の状態を渡す」にあります。
                </p>
                {!settingsDesktopOnly() ? (
                  <p className="settings-note">
                    この操作はデスクトップ版でのみ使えます。
                  </p>
                ) : null}
                <fieldset className="settings-field" disabled={busy || !settingsDesktopOnly()}>
                  <legend>置く先</legend>
                  <label className="settings-field-check">
                    <input
                      type="radio"
                      name="jsonSkillTools"
                      checked={jsonSkillTools === "cursor"}
                      onChange={() => chooseJsonSkillTools("cursor")}
                    />
                    <span>Cursor</span>
                  </label>
                  <label className="settings-field-check">
                    <input
                      type="radio"
                      name="jsonSkillTools"
                      checked={jsonSkillTools === "claude"}
                      onChange={() => chooseJsonSkillTools("claude")}
                    />
                    <span>Claude Code</span>
                  </label>
                  <label className="settings-field-check">
                    <input
                      type="radio"
                      name="jsonSkillTools"
                      checked={jsonSkillTools === "both"}
                      onChange={() => chooseJsonSkillTools("both")}
                    />
                    <span>両方（同じ内容を置く）</span>
                  </label>
                </fieldset>
                <fieldset className="settings-field" disabled={busy || !settingsDesktopOnly()}>
                  <legend>範囲</legend>
                  <label className="settings-field-check">
                    <input
                      type="radio"
                      name="jsonSkillScope"
                      checked={jsonSkillScope === "user"}
                      onChange={() => setJsonSkillScope("user")}
                    />
                    <span>ユーザー全体（自分の作業向け）</span>
                  </label>
                  <label className="settings-field-check">
                    <input
                      type="radio"
                      name="jsonSkillScope"
                      checked={jsonSkillScope === "project"}
                      onChange={() => setJsonSkillScope("project")}
                    />
                    <span>指定したフォルダ（チームで同じ手順を残す向け）</span>
                  </label>
                </fieldset>
                {jsonSkillScope === "project" ? (
                  <div className="settings-field">
                    <span>フォルダ</span>
                    <div className="settings-actions">
                      <button
                        type="button"
                        className="toolbar-btn"
                        disabled={busy || !settingsDesktopOnly()}
                        onClick={() => void handlePickJsonSkillFolder()}
                      >
                        フォルダを選ぶ…
                      </button>
                    </div>
                    {jsonSkillProjectFolder ? (
                      <p className="settings-current">{jsonSkillProjectFolder}</p>
                    ) : (
                      <p className="settings-current muted">未選択</p>
                    )}
                  </div>
                ) : null}
                <div className="settings-actions">
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={
                      busy ||
                      !settingsDesktopOnly() ||
                      confirmJsonSkillReplace ||
                      confirmJsonSkillUninstall
                    }
                    onClick={() => void runJsonSkillInstall(false)}
                  >
                    置く
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={
                      busy ||
                      !settingsDesktopOnly() ||
                      confirmJsonSkillReplace ||
                      confirmJsonSkillUninstall
                    }
                    onClick={requestJsonSkillUninstall}
                  >
                    外す
                  </button>
                </div>
                {jsonSkillRemovedPaths && jsonSkillRemovedPaths.length > 0 ? (
                  <div className="settings-current">
                    <p>外したパス:</p>
                    <ul className="settings-path-list">
                      {jsonSkillRemovedPaths.map((path) => (
                        <li key={path}>{path}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {jsonSkillInstalledPaths && jsonSkillInstalledPaths.length > 0 ? (
                  <div className="settings-current">
                    <p>置いたパス:</p>
                    <ul className="settings-path-list">
                      {jsonSkillInstalledPaths.map((path) => (
                        <li key={path}>{path}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {jsonSkillClaudeShadows && jsonSkillClaudeShadows.length > 0 ? (
                  <p className="settings-note">
                    Claude Code では、ユーザー全体（~/.claude/skills/）にある同名スキルが、プロジェクト用より先に使われます。次のパスに既にあります:{" "}
                    {jsonSkillClaudeShadows.join("、")}
                  </p>
                ) : null}
              </>
            ) : null}
            {section !== "mcp" && message ? (
              <p
                className="settings-message"
                role={messageIsError ? "alert" : "status"}
              >
                {message}
              </p>
            ) : null}
          </div>
        </div>
        {confirmOverwriteId && pendingImport ? (
          <div className="settings-confirm">
            <p>
              「{confirmOverwriteId}」は既にあります。上書きしますか？
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() =>
                  void runImport(
                    pendingImport.catalogId,
                    pendingImport.contents,
                    true,
                  )
                }
              >
                上書き
              </button>
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => {
                  setConfirmOverwriteId(null);
                  setPendingImport(null);
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : null}
        {confirmCalendarOverwrite && pendingCalendarImport ? (
          <div className="settings-confirm">
            <p>既にカレンダーがあります。上書きしますか？</p>
            <div className="modal-actions">
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() =>
                  void runCalendarImport(
                    pendingCalendarImport.label,
                    pendingCalendarImport.contents,
                  )
                }
              >
                上書き
              </button>
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => {
                  setConfirmCalendarOverwrite(false);
                  setPendingCalendarImport(null);
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : null}
        {section === "jsonSkills" &&
        confirmJsonSkillReplace &&
        pendingJsonSkillExisting ? (
          <div className="settings-confirm">
            <p>次の場所に同名のスキルがあります。上書きしますか？中身はマージしません。</p>
            <ul className="settings-path-list">
              {pendingJsonSkillExisting.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
            <div className="modal-actions">
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => void runJsonSkillInstall(true)}
              >
                上書き
              </button>
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => {
                  setConfirmJsonSkillReplace(false);
                  setPendingJsonSkillExisting(null);
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : null}
        {section === "mcp" &&
        confirmReadScreenReplace &&
        pendingReadScreenExisting ? (
          <div className="settings-confirm">
            <p>
              次の場所に read-screen があります。上書きしますか？中身はマージしません。
            </p>
            <ul className="settings-path-list">
              {pendingReadScreenExisting.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
            <div className="modal-actions">
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => void runReadScreenInstall(true)}
              >
                上書き
              </button>
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => {
                  setConfirmReadScreenReplace(false);
                  setPendingReadScreenExisting(null);
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : null}
        {section === "mcp" && confirmReadScreenUninstall ? (
          <div className="settings-confirm">
            <p>
              選んだ場所から read-screen だけを外します。ほかのスキルや skills
              フォルダ自体は残します。
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => void runReadScreenUninstall()}
              >
                外す
              </button>
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => setConfirmReadScreenUninstall(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : null}
        {section === "jsonSkills" && confirmJsonSkillUninstall ? (
          <div className="settings-confirm">
            <p>
              選んだ場所から write-schedule、write-members、write-calendar、write-workspace
              の3つを外します。ほかのスキルや skills フォルダ自体は残します。
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => void runJsonSkillUninstall()}
              >
                外す
              </button>
              <button
                type="button"
                className="toolbar-btn"
                disabled={busy}
                onClick={() => setConfirmJsonSkillUninstall(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="toolbar-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
        {appVersionLine ? (
          <p className="settings-app-version">{appVersionLine}</p>
        ) : null}
    </ModalDialog>
  );
}
