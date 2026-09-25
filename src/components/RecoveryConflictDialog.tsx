import { ModalDialog } from "./ModalDialog";

type RecoveryConflictDialogProps = {
  fileLabel: string;
  onOpenDisk: () => void;
  onRestoreEdits: () => void;
};

export function RecoveryConflictDialog({
  fileLabel,
  onOpenDisk,
  onRestoreEdits,
}: RecoveryConflictDialogProps) {
  return (
    <ModalDialog title="前回の未保存の編集" onClose={onRestoreEdits}>
      <p>
        前回終了時の未保存の編集を復元できます。一方、{fileLabel}{" "}
        はそのあいだに別の内容に更新されています。ファイルの最新内容を開くか、未保存の編集を戻すかを選んでください。
      </p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onOpenDisk}>
          ファイルを開く
        </button>
        <button type="button" className="btn primary" onClick={onRestoreEdits}>
          未保存の編集を戻す
        </button>
      </div>
    </ModalDialog>
  );
}
