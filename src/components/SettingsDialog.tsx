import { useState, useEffect } from "react";
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
};

type SettingsSection = "display" | "members" | "calendar";

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
            {message ? <p className="settings-message">{message}</p> : null}
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
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
    </ModalDialog>
  );
}
