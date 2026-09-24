type DiscardChangesDialogProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

export function DiscardChangesDialog({
  onConfirm,
  onCancel,
}: DiscardChangesDialogProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>未保存の変更</h2>
        <p className="form-note">
          変更は保存されていません。破棄して別のファイルを開きますか？
        </p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="btn danger" onClick={onConfirm}>
            破棄して開く
          </button>
        </div>
      </div>
    </div>
  );
}
