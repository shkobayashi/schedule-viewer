import { useState } from "react";
import type {
  Milestone,
  MilestoneGroup,
  ScheduleId,
  TaskConfidence,
} from "../model/types";
import { ModalDialog } from "./ModalDialog";

type MilestoneEditDialogProps = {
  milestone: Milestone;
  milestoneGroups: MilestoneGroup[];
  onClose: () => void;
  onSave: (patch: {
    name: string;
    date: string;
    confidence: TaskConfidence;
    groupId: ScheduleId;
  }) => boolean;
};

export function MilestoneEditDialog({
  milestone,
  milestoneGroups,
  onClose,
  onSave,
}: MilestoneEditDialogProps) {
  const [name, setName] = useState(milestone.name);
  const [date, setDate] = useState(milestone.date);
  const [confidence, setConfidence] = useState<TaskConfidence>(milestone.confidence);
  const [groupId, setGroupId] = useState(milestone.groupId);
  const [formError, setFormError] = useState<string | null>(null);
  const showGroupSelect = milestoneGroups.length >= 2;

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
        <div className="field">
          <label htmlFor="milestoneConfidence">確度</label>
          <select
            id="milestoneConfidence"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as TaskConfidence)}
          >
            <option value="tentative">未確定</option>
            <option value="committed">確定</option>
          </select>
        </div>
        {showGroupSelect ? (
          <div className="field">
            <label htmlFor="milestoneGroup">グループ</label>
            <select
              id="milestoneGroup"
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
              if (!date) {
                setFormError("日付を入力してください");
                return;
              }
              setFormError(null);
              if (
                !onSave({
                  name,
                  date,
                  confidence,
                  groupId: showGroupSelect ? groupId : milestone.groupId,
                })
              ) {
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
