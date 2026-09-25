type ExternalChangeDialogProps = {
  onOverwrite: () => void;
  onSaveAs: () => void;
  onCancel: () => void;
};

export function ExternalChangeDialog({
  onOverwrite,
  onSaveAs,
  onCancel,
}: ExternalChangeDialogProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>ファイルが更新されています</h2>
        <p>
          開いているファイルが、別のプログラムで更新されています。上書き保存すると、その変更は失われます。
        </p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>
            取り消し
          </button>
          <button type="button" className="btn" onClick={onSaveAs}>
            別名保存
          </button>
          <button type="button" className="btn primary" onClick={onOverwrite}>
            上書き保存
          </button>
        </div>
      </div>
    </div>
  );
}
