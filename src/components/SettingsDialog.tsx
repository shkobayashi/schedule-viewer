import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
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
import { usesCommandKey } from "../model/shortcuts";
import { ModalDialog } from "./ModalDialog";
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
};

export type SettingsSection =
  | "display"
  | "members"
  | "calendar"
  | "updates"
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
}: SettingsDialogProps) {
  const displayScaleShortcut = usesCommandKey(
    navigator.platform || navigator.userAgent,
  )
    ? "⌘+ と ⌘−"
    : "Ctrl++ と Ctrl+-";
  const [section, setSection] = useState<SettingsSection>(initialSection);

  useEffect(() => {
    if (open) setSection(initialSection);
  }, [initialSection, open]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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

  useEffect(() => {
    if (!open) {
      jsonSkillToolsTouched.current = false;
      return;
    }
    if (!isTauri()) return;
    let cancelled = false;
    void fetchJsonSkillHomeDirs()
      .then((homeDirs) => {
        if (cancelled || jsonSkillToolsTouched.current) return;
        setJsonSkillTools(defaultJsonSkillTools(homeDirs));
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
    if (!isTauri()) return;
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
    <ModalDialog title="設定" onClose={onClose} className="modal settings-dialog">
        <div className="settings-layout">
          <nav className="settings-nav" aria-label="設定セクション">
            <button
              type="button"
              className={section === "display" ? "active" : undefined}
              onClick={() => setSection("display")}
            >
              表示
            </button>
            <button
              type="button"
              className={section === "members" ? "active" : undefined}
              onClick={() => setSection("members")}
            >
              メンバー
            </button>
            <button
              type="button"
              className={section === "calendar" ? "active" : undefined}
              onClick={() => setSection("calendar")}
            >
              稼働日
            </button>
            {isTauri() ? (
              <button
                type="button"
                className={section === "updates" ? "active" : undefined}
                onClick={() => setSection("updates")}
              >
                更新
              </button>
            ) : null}
            <button
              type="button"
              className={section === "jsonSkills" ? "active" : undefined}
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
                          className="link-btn"
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
                    className="link-btn"
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
            ) : null}
            {section === "calendar" ? (
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
                    disabled={busy}
                    onClick={() => void handleCalendarImportClick()}
                  >
                    取り込み…
                  </button>
                  {calendarLabel ? (
                    <button
                      type="button"
                      className="link-btn"
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
            ) : null}
            {section === "updates" && isTauri() ? (
              <>
                <p className="settings-note">
                  オンにすると、次回の起動から GitHub Releases
                  の新しい版を確認し、あれば入れ直します。初回はオフです。オンにした直後は確認しません。
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
              </>
            ) : null}
            {section === "jsonSkills" ? (
              <>
                <p className="settings-note">
                  write-schedule、write-members、write-calendar
                  の3つをまとめて置きます。中身はマージしません。git
                  には入れず、置いたパスだけを使います。検証スクリプトは Node.js
                  で動かします。
                </p>
                {!isTauri() ? (
                  <p className="settings-note">
                    この操作はデスクトップ版でのみ使えます。
                  </p>
                ) : null}
                <fieldset className="settings-field" disabled={busy || !isTauri()}>
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
                <fieldset className="settings-field" disabled={busy || !isTauri()}>
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
                        disabled={busy || !isTauri()}
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
                    disabled={
                      busy ||
                      !isTauri() ||
                      confirmJsonSkillReplace ||
                      confirmJsonSkillUninstall
                    }
                    onClick={() => void runJsonSkillInstall(false)}
                  >
                    置く
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    disabled={
                      busy ||
                      !isTauri() ||
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
            {message ? (
              <p
                className="settings-message"
                role={messageIsError ? "alert" : undefined}
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
                disabled={busy}
                onClick={() => void runJsonSkillInstall(true)}
              >
                上書き
              </button>
              <button
                type="button"
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
        {section === "jsonSkills" && confirmJsonSkillUninstall ? (
          <div className="settings-confirm">
            <p>
              選んだ場所から write-schedule、write-members、write-calendar
              の3つを外します。ほかのスキルや skills フォルダ自体は残します。
            </p>
            <div className="modal-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => void runJsonSkillUninstall()}
              >
                外す
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmJsonSkillUninstall(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : null}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
    </ModalDialog>
  );
}
