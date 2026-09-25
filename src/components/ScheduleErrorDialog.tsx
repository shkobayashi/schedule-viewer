import { ModalDialog } from "./ModalDialog";

type ScheduleErrorDialogProps = {
  title?: string;
  message: string;
  onClose: () => void;
};

export function ScheduleErrorDialog({
  title = "スケジュールを読み込めません",
  message,
  onClose,
}: ScheduleErrorDialogProps) {
  return (
    <ModalDialog title={title} onClose={onClose}>
      <pre className="error-text">{message}</pre>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          閉じる
        </button>
      </div>
    </ModalDialog>
  );
}
