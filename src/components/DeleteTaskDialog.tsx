import { ModalDialog } from "./ModalDialog";

type DeleteTaskDialogProps = {
  taskName?: string;
  bulkCount?: number;
  hasDependencies: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteTaskDialog({
  taskName,
  bulkCount,
  hasDependencies,
  onClose,
  onConfirm,
}: DeleteTaskDialogProps) {
  const prompt =
    bulkCount != null && bulkCount > 1
      ? `${bulkCount}件のタスクを削除しますか？`
      : `「${taskName ?? "このタスク"}」を削除しますか？`;
  return (
    <ModalDialog title="タスク削除" onClose={onClose}>
      <p className="form-note">{prompt}</p>
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
    </ModalDialog>
  );
}
