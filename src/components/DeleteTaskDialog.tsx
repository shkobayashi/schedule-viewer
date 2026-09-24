type DeleteTaskDialogProps = {
  taskName: string;
  hasDependencies: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteTaskDialog({
  taskName,
  hasDependencies,
  onClose,
  onConfirm,
}: DeleteTaskDialogProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>タスク削除</h2>
        <p className="form-note">「{taskName}」を削除しますか？</p>
        {hasDependencies ? (
          <p className="form-note">
            このタスクへの前後関係は外れます。残ったタスク同士はつなぎません。
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="btn danger" onClick={onConfirm}>
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
