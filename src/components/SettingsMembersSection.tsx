import { useState } from "react";
import type { AppMembersSettings } from "../model/memberAppData";
import {
  pickMembersJsonFile,
  catalogIdFromFilename,
} from "../model/memberAppData";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "../model/validateMembers";

export type SettingsMembersSectionProps = {
  settings: AppMembersSettings;
  selectedCatalogLabel: string | null;
  onImport: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  onSelectCatalog: (catalogId: string | null) => Promise<void>;
  onDeleteCatalog: (catalogId: string) => Promise<void>;
  onOpenEditor: () => void;
};

/** 設定の「メンバー」欄。カタログ JSON の取り込み、選択、外すを行う。 */
export function SettingsMembersSection({
  settings,
  selectedCatalogLabel,
  onImport,
  onSelectCatalog,
  onDeleteCatalog,
  onOpenEditor,
}: SettingsMembersSectionProps) {
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
    let pick: Awaited<ReturnType<typeof pickMembersJsonFile>>;
    try {
      pick = await pickMembersJsonFile();
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
    const parsed = validateMembers(data);
    if (!parsed.ok) {
      setMessage(formatMembersValidationErrors(parsed.errors));
      return;
    }
    const catalogId = catalogIdFromFilename(pick.name);
    if (settings.catalogs.some((c) => c.id === catalogId)) {
      setPending({ catalogId, contents: pick.contents });
      return;
    }
    await runImport(catalogId, pick.contents, false);
  };

  return (
    <>
      <p className="settings-note">
        メンバー JSON をアプリデータへ取り込み、表示に使うカタログを選びます。スケジュール
        JSON には含めません。
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
                    void run(
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
                  void run(
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
      {settings.selectedCatalogId ? (
        <button
          type="button"
          className="toolbar-btn"
          disabled={busy}
          onClick={() =>
            void run(() => onSelectCatalog(null), "選択を解除できませんでした。")
          }
        >
          選択を解除
        </button>
      ) : null}
      {pending ? (
        <div className="settings-confirm" role="alertdialog" aria-modal="true">
          <p>
            「{pending.catalogId}」は既にあります。上書きして取り込みますか？
          </p>
          <div className="settings-actions">
            <button
              type="button"
              className="toolbar-btn toolbar-btn-primary"
              disabled={busy}
              onClick={() => void runImport(pending.catalogId, pending.contents, true)}
            >
              上書き
            </button>
            <button
              type="button"
              className="toolbar-btn"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p className="settings-message" role="status">
          {message}
        </p>
      ) : null}
    </>
  );
}
