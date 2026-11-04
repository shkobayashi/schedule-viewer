import { isTauri } from "@tauri-apps/api/core";
import { ModalDialog } from "./ModalDialog";
import { shortcutReferenceRows, usesCommandKey } from "../model/shortcuts";

type ShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  if (!open) return null;
  const commandKey = usesCommandKey(navigator.platform || navigator.userAgent);
  const rows = shortcutReferenceRows(commandKey).filter(
    (row) => isTauri() || row.action !== "新しいウィンドウで開く",
  );
  return (
    <ModalDialog
      title="ショートカット"
      onClose={onClose}
      className="ui-dialog-panel--shortcuts shortcuts-modal"
    >
      <div className="ui-dialog-body shortcuts-modal-body">
      <table className="shortcuts-table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.action}>
              <th scope="row">{row.action}</th>
              <td>{row.keys}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </ModalDialog>
  );
}
