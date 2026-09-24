type JsonDialogProps = {
  json: string;
  open: boolean;
  onClose: () => void;
};

export function JsonDialog({ json, open, onClose }: JsonDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal wide">
        <h2>現在のスケジュールJSON</h2>
        <textarea className="json-textarea" readOnly value={json} />
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
