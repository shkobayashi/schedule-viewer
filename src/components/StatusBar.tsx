import type { GridTier } from "../model/timeline";

type StatusBarProps = {
  fileName: string;
  saveStatus: string;
  saveStatusClickable: boolean;
  onSaveStatusClick: () => void;
  membersCatalogLabel: string | null;
  membersCatalogError: string | null;
  calendarError: string | null;
  tier: GridTier;
  visibleTaskCount: number;
  totalTaskCount: number;
  showDeferredReload: boolean;
  onDeferredReload: () => void;
  onOpenSettingsMembers: () => void;
  onOpenSettingsCalendar: () => void;
  onOpenShortcuts: () => void;
};

function tierLabel(tier: GridTier): string {
  if (tier === "day") return "日表示";
  if (tier === "week") return "週表示";
  return "月表示";
}

export function StatusBar({
  fileName,
  saveStatus,
  saveStatusClickable,
  onSaveStatusClick,
  membersCatalogLabel,
  membersCatalogError,
  calendarError,
  tier,
  visibleTaskCount,
  totalTaskCount,
  showDeferredReload,
  onDeferredReload,
  onOpenSettingsMembers,
  onOpenSettingsCalendar,
  onOpenShortcuts,
}: StatusBarProps) {
  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar-group">
        <span className="status-bar-item status-bar-file">{fileName}</span>
        <span className="status-bar-sep" aria-hidden="true">
          ·
        </span>
        {saveStatusClickable ? (
          <button
            type="button"
            className="status-bar-link status-bar-unsaved"
            onClick={onSaveStatusClick}
            title="差分を表示"
          >
            {saveStatus}
          </button>
        ) : (
          <span className="status-bar-item">{saveStatus}</span>
        )}
      </div>
      {showDeferredReload ? (
        <button type="button" className="status-bar-action" onClick={onDeferredReload}>
          ファイルに更新あり — 読み直す
        </button>
      ) : null}
      {membersCatalogError ? (
        <button
          type="button"
          className="status-bar-warning"
          title={membersCatalogError}
          onClick={onOpenSettingsMembers}
        >
          メンバー設定エラー
        </button>
      ) : membersCatalogLabel ? (
        <span className="status-bar-item">{membersCatalogLabel}</span>
      ) : null}
      {calendarError ? (
        <button
          type="button"
          className="status-bar-warning"
          title={calendarError}
          onClick={onOpenSettingsCalendar}
        >
          カレンダー設定エラー
        </button>
      ) : null}
      <span className="status-bar-item">{tierLabel(tier)}</span>
      <span className="status-bar-item status-bar-count">
        {visibleTaskCount}件中{totalTaskCount}件を表示
      </span>
      <button
        type="button"
        className="status-bar-link"
        onClick={onOpenShortcuts}
        title="ショートカット一覧（?、F1）"
      >
        ? ショートカット
      </button>
    </footer>
  );
}
