import { ModalDialog } from "./ModalDialog";

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
    <ModalDialog title="ファイルが更新されています" onClose={onCancel}>
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
    </ModalDialog>
  );
}
