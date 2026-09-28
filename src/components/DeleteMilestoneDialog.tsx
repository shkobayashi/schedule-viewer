import { ModalDialog } from "./ModalDialog";

type DeleteMilestoneDialogProps = {
  milestoneName: string;
  hasLinkedTasks: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteMilestoneDialog({
  milestoneName,
  hasLinkedTasks,
  onClose,
  onConfirm,
}: DeleteMilestoneDialogProps) {
  return (
    <ModalDialog title="マイルストン削除" onClose={onClose}>
      <p className="form-note">「{milestoneName}」を削除しますか？</p>
      {hasLinkedTasks ? (
        <p className="form-note">
          このマイルストンを指しているタスクの対応は外れます。タスクの日付は変えません。
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
