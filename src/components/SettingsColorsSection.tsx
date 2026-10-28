import { useState } from "react";
import type { AppColorsSettings } from "../model/colorAppData";
import {
  pickColorsJsonFile,
  colorCatalogIdFromFilename,
} from "../model/colorAppData";
import {
  formatColorsValidationErrors,
  validateColors,
} from "../model/validateColors";

export type SettingsColorsSectionProps = {
  settings: AppColorsSettings;
  selectedCatalogLabel: string | null;
  onImport: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  onSelectCatalog: (catalogId: string | null) => Promise<void>;
  onDeleteCatalog: (catalogId: string) => Promise<void>;
  onOpenEditor: () => void;
};

/** 設定の「色」欄。一覧 JSON の取り込み、選択、外すを行う。 */
export function SettingsColorsSection({
  settings,
  selectedCatalogLabel,
  onImport,
  onSelectCatalog,
  onDeleteCatalog,
  onOpenEditor,
}: SettingsColorsSectionProps) {
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
      setMessage(`「${catalogId}」を取り込みました。`);
      setPending(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取り込みに失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = async () => {
    let pick: Awaited<ReturnType<typeof pickColorsJsonFile>>;
    try {
      pick = await pickColorsJsonFile();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取り込みに失敗しました。");
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
    const parsed = validateColors(data);
    if (!parsed.ok) {
      setMessage(formatColorsValidationErrors(parsed.errors));
      return;
    }
    const catalogId = colorCatalogIdFromFilename(pick.name);
    if (settings.catalogs.some((c) => c.id === catalogId)) {
      setPending({ catalogId, contents: pick.contents });
      return;
    }
    await runImport(catalogId, pick.contents, false);
  };

  return (
    <>
      <p className="settings-note">
        色の一覧 JSON をアプリデータへ取り込み、行の地に使う色を一つ選びます。タスクが持つのは
        <code>colorId</code> だけで、一覧はスケジュール JSON に含めません。選んでいないときは、行の地は塗りません。組み込みの色には戻りません。
      </p>
      <p className="settings-current">
        使用中: {selectedCatalogLabel ?? "未選択"}
      </p>
      <div className="settings-actions">
        <button
          type="button"
          className="toolbar-btn"
          disabled={busy}
          onClick={() => void handleImportClick()}
        >
          取り込み…
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={busy}
          onClick={onOpenEditor}
        >
          項目を編集…
        </button>
      </div>
      {pending ? (
        <div className="settings-confirm" role="alertdialog" aria-label="上書きの確認">
          <p>「{pending.catalogId}」は既にあります。上書きしますか。</p>
          <div className="settings-actions">
            <button
              type="button"
              className="toolbar-btn"
              disabled={busy}
              onClick={() => void runImport(pending.catalogId, pending.contents, true)}
            >
              上書きする
            </button>
            <button
              type="button"
              className="toolbar-btn"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              やめる
            </button>
          </div>
        </div>
      ) : null}
      <ul className="settings-catalog-list">
        {settings.catalogs.length === 0 ? (
          <li className="muted">取り込み済みの一覧はありません。</li>
        ) : (
          settings.catalogs.map((catalog) => (
            <li key={catalog.id}>
              <label className="settings-catalog-row">
                <input
                  type="radio"
                  name="colorCatalog"
                  checked={settings.selectedCatalogId === catalog.id}
                  disabled={busy}
                  onChange={() =>
                    void run(
                      () => onSelectCatalog(catalog.id),
                      "一覧を選択できませんでした。",
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
                    "一覧を外せませんでした。",
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
            void run(() => onSelectCatalog(null), "選択を解除できませんでした。")
          }
        >
          選択を解除
        </button>
      ) : null}
      {message ? (
        <p className="settings-message" role="status">
          {message}
        </p>
      ) : null}
    </>
  );
}
