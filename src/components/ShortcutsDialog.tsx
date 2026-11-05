import { isTauri } from "@tauri-apps/api/core";
import { ModalDialog } from "./ModalDialog";
import {
  MODE_KEYBOARD_TABLE_INTRO,
  modeKeyboardReferenceRows,
  type ModeKeyboardReferenceRow,
} from "../model/modeKeyboardReference";
import { shortcutReferenceRows, usesCommandKey } from "../model/shortcuts";

type ShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
};

function ModeKeyboardTable({ rows }: { rows: readonly ModeKeyboardReferenceRow[] }) {
  return (
    <table className="shortcuts-table shortcuts-table--mode">
      <thead>
        <tr>
          <th scope="col">場面</th>
          <th scope="col">Esc</th>
          <th scope="col">Enter</th>
          <th scope="col">Tab</th>
          <th scope="col">矢印</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.mode}>
            <th scope="row">{row.mode}</th>
            <td>{row.escape}</td>
            <td>{row.enter}</td>
            <td>{row.tab}</td>
            <td>{row.arrows}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ModeKeyboardNotes({ rows }: { rows: readonly ModeKeyboardReferenceRow[] }) {
  const noted = rows.filter((row) => row.note);
  if (noted.length === 0) return null;
  return (
    <ul className="shortcuts-mode-notes">
      {noted.map((row) => (
        <li key={row.mode}>
          <span className="shortcuts-mode-notes-label">{row.mode}</span>
          {row.note}
        </li>
      ))}
    </ul>
  );
}

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  if (!open) return null;
  const commandKey = usesCommandKey(navigator.platform || navigator.userAgent);
  const rows = shortcutReferenceRows(commandKey).filter(
    (row) => isTauri() || row.action !== "新しいウィンドウで開く",
  );
  const modeRows = modeKeyboardReferenceRows();
  return (
    <ModalDialog
      title="ショートカット"
      onClose={onClose}
      className="ui-dialog-panel--shortcuts shortcuts-modal"
    >
      <div className="ui-dialog-body ui-dialog-body--scroll shortcuts-modal-body">
        <h3 className="shortcuts-section-title">操作の入口</h3>
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
        <div id="shortcuts-mode-capture" className="shortcuts-mode-capture">
          <h3 className="shortcuts-section-title" id="shortcuts-section-mode">
            編集中・モード内
          </h3>
          <p className="shortcuts-mode-intro">{MODE_KEYBOARD_TABLE_INTRO}</p>
          <ModeKeyboardTable rows={modeRows} />
          <ModeKeyboardNotes rows={modeRows} />
        </div>
      </div>
    </ModalDialog>
  );
}
