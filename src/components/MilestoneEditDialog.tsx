import { useState } from "react";
import type { Milestone } from "../model/types";
import { ModalDialog } from "./ModalDialog";

type MilestoneEditDialogProps = {
  milestone: Milestone;
  onClose: () => void;
  onSave: (patch: { name: string; date: string }) => boolean;
};

export function MilestoneEditDialog({
  milestone,
  onClose,
  onSave,
}: MilestoneEditDialogProps) {
  const [name, setName] = useState(milestone.name);
  const [date, setDate] = useState(milestone.date);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <ModalDialog title="マイルストン編集" onClose={onClose}>
        <div className="field">
          <label htmlFor="milestoneName">名前</label>
          <input
            id="milestoneName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="milestoneDate">日付</label>
          <input
            id="milestoneDate"
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
              if (!date) {
                setFormError("日付を入力してください");
                return;
              }
              setFormError(null);
              if (!onSave({ name, date })) {
                setFormError("保存できませんでした。入力内容を確認してください。");
              }
            }}
          >
            保存
          </button>
        </div>
    </ModalDialog>
  );
}
