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
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>{title}</h2>
        <pre className="error-text">{message}</pre>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
