import { useEffect, useState } from "react";
import type { Milestone } from "../model/types";

type MilestoneEditDialogProps = {
  milestone: Milestone | null;
  onClose: () => void;
  onSave: (patch: { name: string; date: string }) => boolean;
};

export function MilestoneEditDialog({
  milestone,
  onClose,
  onSave,
}: MilestoneEditDialogProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (!milestone) return;
    setName(milestone.name);
    setDate(milestone.date);
  }, [milestone]);

  if (!milestone) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>マイルストン編集</h2>
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
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (onSave({ name, date })) onClose();
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
