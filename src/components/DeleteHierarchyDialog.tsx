import { ModalDialog } from "./ModalDialog";

type DeleteHierarchyDialogProps = {
  label: string;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteHierarchyDialog({
  label,
  name,
  onClose,
  onConfirm,
}: DeleteHierarchyDialogProps) {
  return (
    <ModalDialog title={`${label}削除`} onClose={onClose}>
      <p className="form-note">「{name}」を削除しますか？</p>
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
