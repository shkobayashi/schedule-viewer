import { ModalDialog } from "./ModalDialog";

type DiscardChangesDialogProps = {
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
};

export function DiscardChangesDialog({
  onConfirm,
  onCancel,
  title = "未保存の変更",
  message = "変更は保存されていません。破棄して別のファイルを開きますか？",
  confirmLabel = "破棄して開く",
}: DiscardChangesDialogProps) {
  return (
    <ModalDialog title={title} onClose={onCancel}>
      <p className="form-note">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          キャンセル
        </button>
        <button type="button" className="btn danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </ModalDialog>
  );
}
