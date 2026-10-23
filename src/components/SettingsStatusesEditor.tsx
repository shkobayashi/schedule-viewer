import { useMemo, useState } from "react";
import { exportStatusesJson } from "../model/statusAppData";
import type { StatusItem } from "../model/statusCatalog";
import {
  moveStatusItem,
  newStatusItem,
  nextStatusCatalogId,
  removeStatusItem,
  sameStatusItems,
  statusDraftError,
  statusesToJson,
  updateStatusItem,
} from "../model/statusEdit";

export type SettingsStatusesEditorProps = {
  /** 使用中の一覧の項目。一覧を選んでいないときは組み込みの三件。 */
  items: readonly StatusItem[];
  selectedCatalogId: string | null;
  catalogIds: readonly string[];
  busy: boolean;
  onSave: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  onMessage: (message: string | null) => void;
};

const COLOR_FIELDS = [
  { scheme: "light", key: "bg", label: "ライト 地" },
  { scheme: "light", key: "border", label: "ライト 枠" },
  { scheme: "dark", key: "bg", label: "ダーク 地" },
  { scheme: "dark", key: "border", label: "ダーク 枠" },
] as const;

/** 設定の「ステータス」欄で、使用中の一覧の項目を編集して保存する。 */
export function SettingsStatusesEditor({
  items,
  selectedCatalogId,
  catalogIds,
  busy,
  onSave,
  onMessage,
}: SettingsStatusesEditorProps) {
  const [draft, setDraft] = useState<readonly StatusItem[]>(items);
  const savedIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const dirty = !sameStatusItems(draft, items);
  const error = statusDraftError(draft);

  const save = async () => {
    if (!selectedCatalogId || error) return;
    try {
      await onSave(selectedCatalogId, statusesToJson(draft), true);
      onMessage(`「${selectedCatalogId}」を保存しました。`);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "保存に失敗しました。");
    }
  };

  const createCatalog = async () => {
    const id = nextStatusCatalogId(catalogIds);
    try {
      await onSave(id, statusesToJson(items), false);
      onMessage(`「${id}」を作って使用中にしました。`);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "作成に失敗しました。");
    }
  };

  const exportJson = async () => {
    if (error) return;
    try {
      const path = await exportStatusesJson(
        statusesToJson(draft),
        selectedCatalogId ?? "statuses",
      );
      onMessage(path ? `${path} に書き出しました。` : null);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "書き出しに失敗しました。");
    }
  };

  const change = (next: StatusItem[]) => {
    setDraft(next);
    onMessage(null);
  };

  return (
    <section className="settings-status-editor" aria-label="項目の編集">
      <h4>項目</h4>
      <p className="settings-note">
        並びは、詳細パネルと絞り込みの選択肢の順です。<code>id</code> は項目を足すときだけ決められます。項目を外しても、その
        <code>id</code> を持つタスクは変わりません。一覧に無い <code>id</code> として、<code>id</code> のまま中立の色で出ます。
      </p>
      {selectedCatalogId == null ? (
        <p className="settings-note">
          一覧を選んでいないので、編集できません。「新しい一覧を作る」で、今の三件から一覧を作ります。
        </p>
      ) : null}
      <ul className="settings-status-items">
        {draft.map((item, index) => (
          <li key={savedIds.has(item.id) ? item.id : `new-${index}`} className="settings-status-item">
            <div className="settings-status-row">
              <label>
                id
                <input
                  type="text"
                  value={item.id}
                  readOnly={savedIds.has(item.id)}
                  disabled={selectedCatalogId == null || busy}
                  onChange={(e) => change(updateStatusItem(draft, index, { id: e.target.value }))}
                />
              </label>
              <label>
                表示名
                <input
                  type="text"
                  value={item.name}
                  disabled={selectedCatalogId == null || busy}
                  onChange={(e) => change(updateStatusItem(draft, index, { name: e.target.value }))}
                />
              </label>
              <label className="settings-status-closed">
                <input
                  type="checkbox"
                  checked={item.closed}
                  disabled={selectedCatalogId == null || busy}
                  onChange={(e) => change(updateStatusItem(draft, index, { closed: e.target.checked }))}
                />
                完了として扱う
              </label>
            </div>
            <div className="settings-status-row">
              {COLOR_FIELDS.map(({ scheme, key, label }) => (
                <label key={`${scheme}-${key}`}>
                  {label}
                  <input
                    type="color"
                    value={item.color[scheme][key]}
                    disabled={selectedCatalogId == null || busy}
                    onChange={(e) =>
                      change(
                        updateStatusItem(draft, index, {
                          color: { [scheme]: { [key]: e.target.value } },
                        }),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <label className="settings-status-description">
              説明
              <textarea
                rows={2}
                value={item.description}
                disabled={selectedCatalogId == null || busy}
                onChange={(e) => change(updateStatusItem(draft, index, { description: e.target.value }))}
              />
            </label>
            <div className="settings-actions">
              <button
                type="button"
                className="toolbar-btn"
                aria-label={`${item.name}を上へ`}
                disabled={selectedCatalogId == null || busy || index === 0}
                onClick={() => change(moveStatusItem(draft, index, -1))}
              >
                上へ
              </button>
              <button
                type="button"
                className="toolbar-btn"
                aria-label={`${item.name}を下へ`}
                disabled={selectedCatalogId == null || busy || index === draft.length - 1}
                onClick={() => change(moveStatusItem(draft, index, 1))}
              >
                下へ
              </button>
              <button
                type="button"
                className="toolbar-btn"
                aria-label={`${item.name}を削除`}
                disabled={selectedCatalogId == null || busy || draft.length <= 1}
                onClick={() => change(removeStatusItem(draft, index))}
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && dirty ? (
        <p className="settings-message" role="status">
          {error}
        </p>
      ) : null}
      <div className="settings-actions">
        <button
          type="button"
          className="toolbar-btn"
          disabled={selectedCatalogId == null || busy}
          onClick={() => change([...draft, newStatusItem(draft)])}
        >
          項目を足す
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={selectedCatalogId == null || busy || !dirty || error != null}
          onClick={() => void save()}
        >
          保存
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={!dirty || busy}
          onClick={() => change([...items])}
        >
          編集を戻す
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={busy || error != null}
          onClick={() => void exportJson()}
        >
          JSON を書き出す
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={busy}
          onClick={() => void createCatalog()}
        >
          新しい一覧を作る
        </button>
      </div>
    </section>
  );
}
