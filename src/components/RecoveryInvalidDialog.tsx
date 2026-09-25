import { ModalDialog } from "./ModalDialog";

type RecoveryInvalidDialogProps = {
  message: string;
  onClose: () => void;
  onDiscard: () => void;
};

export function RecoveryInvalidDialog({
  message,
  onClose,
  onDiscard,
}: RecoveryInvalidDialogProps) {
  return (
    <ModalDialog title="復旧用の控え" onClose={onClose}>
      <p className="form-note">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          閉じる
        </button>
        <button type="button" className="btn danger" onClick={onDiscard}>
          控えを破棄
        </button>
      </div>
    </ModalDialog>
  );
}
