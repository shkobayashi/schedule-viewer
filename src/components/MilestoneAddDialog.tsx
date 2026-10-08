import { useState } from "react";
import { validateNewMilestone } from "../model/milestones";
import type { MilestoneGroup, ScheduleId, TaskConfidence } from "../model/types";
import { ModalDialog } from "./ModalDialog";

type MilestoneAddDialogProps = {
  initialDate: string;
  initialGroupId: ScheduleId | null;
  milestoneGroups: MilestoneGroup[];
  onClose: () => void;
  onSave: (input: {
    name: string;
    date: string;
    confidence: TaskConfidence;
    groupId: ScheduleId | null;
  }) => string | null;
};

export function MilestoneAddDialog({
  initialDate,
  initialGroupId,
  milestoneGroups,
  onClose,
  onSave,
}: MilestoneAddDialogProps) {
  const showGroupSelect = milestoneGroups.length >= 2;
  const defaultGroupId =
    initialGroupId != null &&
    milestoneGroups.some((group) => group.id === initialGroupId)
      ? initialGroupId
      : milestoneGroups[0]?.id ?? "";
  const [name, setName] = useState("");
  const [date, setDate] = useState(initialDate);
  const [confidence, setConfidence] = useState<TaskConfidence>("tentative");
  const [groupId, setGroupId] = useState(defaultGroupId);
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
        <div className="field">
          <label htmlFor="addMilestoneConfidence">確度</label>
          <select
            id="addMilestoneConfidence"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as TaskConfidence)}
          >
            <option value="tentative">未確定</option>
            <option value="committed">確定</option>
          </select>
        </div>
        {showGroupSelect ? (
          <div className="field">
            <label htmlFor="addMilestoneGroup">グループ</label>
            <select
              id="addMilestoneGroup"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              {milestoneGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
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
              const saved = onSave({
                name,
                date,
                confidence,
                groupId: showGroupSelect ? groupId : null,
              });
              if (saved) setFormError(saved);
            }}
          >
            保存
          </button>
        </div>
    </ModalDialog>
  );
}
