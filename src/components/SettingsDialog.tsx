import { useState } from "react";
import type { AppMembersSettings } from "../model/memberAppData";
import {
  catalogIdFromFilename,
  pickMembersJsonFile,
} from "../model/memberAppData";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "../model/validateMembers";

type SettingsDialogProps = {
  open: boolean;
  settings: AppMembersSettings;
  selectedCatalogLabel: string | null;
  onClose: () => void;
  onImport: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  onSelectCatalog: (catalogId: string | null) => Promise<void>;
  onDeleteCatalog: (catalogId: string) => Promise<void>;
};

type SettingsSection = "members";

export function SettingsDialog({
  open,
  settings,
  selectedCatalogLabel,
  onClose,
  onImport,
  onSelectCatalog,
  onDeleteCatalog,
}: SettingsDialogProps) {
  const [section, setSection] = useState<SettingsSection>("members");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(
    null,
  );
  const [pendingImport, setPendingImport] = useState<{
    catalogId: string;
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
    const pick = await pickMembersJsonFile();
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

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal settings-dialog">
        <h2>設定</h2>
        <div className="settings-layout">
          <nav className="settings-nav" aria-label="設定セクション">
            <button
              type="button"
              className={section === "members" ? "active" : undefined}
              onClick={() => setSection("members")}
            >
              メンバー
            </button>
          </nav>
          <div className="settings-panel">
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
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
