import { useState, type ReactNode } from "react";
import type { AppCatalogSettings } from "../model/catalogAppDataLoader";
import {
  SETTINGS_CATALOG_SHARED_COPY,
  type SettingsCatalogSectionKindCopy,
} from "../model/settingsCatalogSectionCopy";

export type SettingsCatalogSectionProps = {
  settings: AppCatalogSettings;
  selectedCatalogLabel: string | null;
  kindCopy: SettingsCatalogSectionKindCopy;
  note: ReactNode;
  onImport: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  onSelectCatalog: (catalogId: string | null) => Promise<void>;
  onDeleteCatalog: (catalogId: string) => Promise<void>;
  onOpenEditor: () => void;
  pickFile: () => Promise<{ name: string; contents: string } | null>;
  validateImportedJson: (
    data: unknown,
  ) => { ok: true } | { ok: false; message: string };
  catalogIdFromFilename: (filename: string) => string;
};

/** 設定のカタログ節（取り込み・選択・外す・上書き確認）の共通 UI。 */
export function SettingsCatalogSection({
  settings,
  selectedCatalogLabel,
  kindCopy,
  note,
  onImport,
  onSelectCatalog,
  onDeleteCatalog,
  onOpenEditor,
  pickFile,
  validateImportedJson,
  catalogIdFromFilename,
}: SettingsCatalogSectionProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    catalogId: string;
    contents: string;
  } | null>(null);

  const run = async (action: () => Promise<void>, failure: string) => {
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
      setMessage(SETTINGS_CATALOG_SHARED_COPY.importSuccess(catalogId));
      setPending(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : SETTINGS_CATALOG_SHARED_COPY.importFailure,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = async () => {
    let pick: Awaited<ReturnType<typeof pickFile>>;
    try {
      pick = await pickFile();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : SETTINGS_CATALOG_SHARED_COPY.importFailure,
      );
      return;
    }
    if (!pick) return;
    let data: unknown;
    try {
      data = JSON.parse(pick.contents.replace(/^\uFEFF/, ""));
    } catch {
      setMessage(SETTINGS_CATALOG_SHARED_COPY.invalidJson);
      return;
    }
    const parsed = validateImportedJson(data);
    if (!parsed.ok) {
      setMessage(parsed.message);
      return;
    }
    const catalogId = catalogIdFromFilename(pick.name);
    if (settings.catalogs.some((c) => c.id === catalogId)) {
      setPending({ catalogId, contents: pick.contents });
      return;
    }
    await runImport(catalogId, pick.contents, false);
  };

  const confirmDialog = pending ? (
    <div
      className="settings-confirm"
      role="alertdialog"
      {...(kindCopy.confirm.useAriaModal
        ? { "aria-modal": true as const }
        : kindCopy.confirm.ariaLabel
          ? { "aria-label": kindCopy.confirm.ariaLabel }
          : {})}
    >
      <p>{kindCopy.confirm.body(pending.catalogId)}</p>
      <div className="settings-actions">
        <button
          type="button"
          className={
            kindCopy.confirm.confirmPrimary
              ? "toolbar-btn toolbar-btn-primary"
              : "toolbar-btn"
          }
          disabled={busy}
          onClick={() => void runImport(pending.catalogId, pending.contents, true)}
        >
          {kindCopy.confirm.confirmButton}
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={busy}
          onClick={() => setPending(null)}
        >
          {kindCopy.confirm.cancelButton}
        </button>
      </div>
    </div>
  ) : null;

  const catalogList = (
    <ul className="settings-catalog-list">
      {settings.catalogs.length === 0 ? (
        <li className="muted">{kindCopy.emptyListMessage}</li>
      ) : (
        settings.catalogs.map((catalog) => (
          <li key={catalog.id}>
            <label className="settings-catalog-row">
              <input
                type="radio"
                name={kindCopy.radioGroupName}
                checked={settings.selectedCatalogId === catalog.id}
                disabled={busy}
                onChange={() =>
                  void run(
                    () => onSelectCatalog(catalog.id),
                    kindCopy.selectFailure,
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
                void run(
                  () => onDeleteCatalog(catalog.id),
                  kindCopy.deleteFailure,
                )
              }
            >
              {SETTINGS_CATALOG_SHARED_COPY.removeButton}
            </button>
          </li>
        ))
      )}
    </ul>
  );

  const showClear =
    kindCopy.clearSelectionMode === "whenAnyCatalog"
      ? settings.catalogs.length > 0
      : Boolean(settings.selectedCatalogId);

  const clearDisabled =
    kindCopy.clearSelectionMode === "whenAnyCatalog"
      ? busy || settings.selectedCatalogId == null
      : busy;

  const clearButton = showClear ? (
    <button
      type="button"
      className="toolbar-btn"
      disabled={clearDisabled}
      onClick={() =>
        void run(
          () => onSelectCatalog(null),
          SETTINGS_CATALOG_SHARED_COPY.clearSelectionFailure,
        )
      }
    >
      {SETTINGS_CATALOG_SHARED_COPY.clearSelection}
    </button>
  ) : null;

  if (kindCopy.confirmPlacement === "afterList") {
    return (
      <>
        <p className="settings-note">{note}</p>
        <p className="settings-current">
          {SETTINGS_CATALOG_SHARED_COPY.currentPrefix}
          {selectedCatalogLabel ?? kindCopy.selectedFallback}
        </p>
        <div className="settings-actions">
          <button
            type="button"
            className="toolbar-btn"
            disabled={busy}
            onClick={() => void handleImportClick()}
          >
            {SETTINGS_CATALOG_SHARED_COPY.importButton}
          </button>
          <button
            type="button"
            className="toolbar-btn"
            disabled={busy}
            onClick={onOpenEditor}
          >
            {SETTINGS_CATALOG_SHARED_COPY.editButton}
          </button>
        </div>
        {catalogList}
        {clearButton}
        {confirmDialog}
        {message ? (
          <p className="settings-message" role="status">
            {message}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p className="settings-note">{note}</p>
      <p className="settings-current">
        {SETTINGS_CATALOG_SHARED_COPY.currentPrefix}
        {selectedCatalogLabel ?? kindCopy.selectedFallback}
      </p>
      <div className="settings-actions">
        <button
          type="button"
          className="toolbar-btn"
          disabled={busy}
          onClick={() => void handleImportClick()}
        >
          {SETTINGS_CATALOG_SHARED_COPY.importButton}
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={busy}
          onClick={onOpenEditor}
        >
          {SETTINGS_CATALOG_SHARED_COPY.editButton}
        </button>
      </div>
      {confirmDialog}
      {catalogList}
      {clearButton}
      {message ? (
        <p className="settings-message" role="status">
          {message}
        </p>
      ) : null}
    </>
  );
}
