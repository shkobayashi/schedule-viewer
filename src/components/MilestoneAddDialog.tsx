import { useState } from "react";
import { validateNewMilestone } from "../model/milestones";
import { ModalDialog } from "./ModalDialog";

type MilestoneAddDialogProps = {
  initialDate: string;
  onClose: () => void;
  onSave: (input: { name: string; date: string }) => string | null;
};

export function MilestoneAddDialog({
  initialDate,
  onClose,
  onSave,
}: MilestoneAddDialogProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(initialDate);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <ModalDialog title="マイルストン追加" onClose={onClose}>
        <div className="field">
          <label htmlFor="addMilestoneName">名前</label>
          <input
            id="addMilestoneName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="addMilestoneDate">日付</label>
          <input
            id="addMilestoneDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {formError ? <p className="form-error">{formError}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const message = validateNewMilestone({ name, date });
              if (message) {
                setFormError(message);
                return;
              }
              const saved = onSave({ name, date });
              if (saved) setFormError(saved);
            }}
          >
            保存
          </button>
        </div>
    </ModalDialog>
  );
}
