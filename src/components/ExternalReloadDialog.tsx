import { ModalDialog } from "./ModalDialog";

type ExternalReloadDialogProps = {
  onReload: () => void;
  onKeepLocal: () => void;
};

export function ExternalReloadDialog({
  onReload,
  onKeepLocal,
}: ExternalReloadDialogProps) {
  return (
    <ModalDialog title="ファイルが更新されています" onClose={onKeepLocal}>
      <p>
        開いているファイルが別のプログラムで更新されました。画面には未保存の変更があります。ファイルの内容を読み直すと、画面の変更は失われます。
      </p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onKeepLocal}>
          画面の編集を残す
        </button>
        <button type="button" className="btn primary" onClick={onReload}>
          読み直す
        </button>
      </div>
    </ModalDialog>
  );
}
