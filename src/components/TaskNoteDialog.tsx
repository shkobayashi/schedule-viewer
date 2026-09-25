import { useState } from "react";
import { normalizeTaskNote } from "../model/taskNote";
import { ModalDialog } from "./ModalDialog";
import type { Task } from "../model/types";

type TaskNoteDialogProps = {
  task: Task;
  onClose: () => void;
  onSave: (note: string) => void;
};

export function TaskNoteDialog({ task, onClose, onSave }: TaskNoteDialogProps) {
  const [note, setNote] = useState(() => normalizeTaskNote(task.note) ?? "");
  const empty = normalizeTaskNote(note) === undefined;

  return (
    <ModalDialog title={task.name} onClose={onClose} className="modal editor">
      {empty ? <p className="note-empty">ノートはありません</p> : null}
      <div className="field">
        <label htmlFor="fieldNote">ノート</label>
        <textarea
          id="fieldNote"
          className="note-textarea"
          rows={8}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          キャンセル
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            onSave(note);
            onClose();
          }}
        >
          保存
        </button>
      </div>
    </ModalDialog>
  );
}
