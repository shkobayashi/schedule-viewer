import { ModalDialog } from "./ModalDialog";
import { shortcutReferenceRows, usesCommandKey } from "../model/shortcuts";

type ShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  if (!open) return null;
  const commandKey = usesCommandKey(navigator.platform || navigator.userAgent);
  const rows = shortcutReferenceRows(commandKey);
  return (
    <ModalDialog title="ショートカット" onClose={onClose} className="modal shortcuts-modal">
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
    </ModalDialog>
  );
}
