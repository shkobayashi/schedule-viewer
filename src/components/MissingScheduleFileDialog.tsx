import { ModalDialog } from "./ModalDialog";

type MissingScheduleFileDialogProps = {
  fileLabel: string;
  onClose: () => void;
};

export function MissingScheduleFileDialog({
  fileLabel,
  onClose,
}: MissingScheduleFileDialogProps) {
  return (
    <ModalDialog title="ファイルが見つかりません" onClose={onClose}>
      <p>
        前回開いていた {fileLabel}{" "}
        が見つかりません。サンプルを表示します。
      </p>
      <div className="modal-actions">
        <button type="button" className="btn primary" onClick={onClose}>
          閉じる
        </button>
      </div>
    </ModalDialog>
  );
}
