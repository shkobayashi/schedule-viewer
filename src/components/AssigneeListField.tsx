import { useMemo } from "react";
import {
  duplicateMemberNames,
  formatUnknownAssigneeOption,
  memberOptionLabel,
  segmentLabelForAssigneeId,
} from "../model/assigneeDisplay";
import {
  appendAssigneeId,
  moveAssigneeId,
  removeAssigneeAt,
} from "../model/assigneeIds";
import type { Member, MemberId } from "../model/memberTypes";

type AssigneeListFieldProps = {
  idPrefix: string;
  assigneeIds: readonly MemberId[];
  members: Member[];
  memberCatalog: Map<MemberId, Member> | null;
  onChange: (next: MemberId[]) => void;
};

export function AssigneeListField({
  idPrefix,
  assigneeIds,
  members,
  memberCatalog,
  onChange,
}: AssigneeListFieldProps) {
  const duplicateNames = useMemo(
    () => duplicateMemberNames(members),
    [members],
  );
  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const addOptions = members.filter((member) => !assigneeIds.includes(member.id));

  return (
    <div className="assignee-list-field">
      {assigneeIds.length > 0 ? (
        <ul className="assignee-list" aria-label="担当者">
          {assigneeIds.map((id, index) => {
            const label = memberIds.has(id)
              ? segmentLabelForAssigneeId(id, memberCatalog, duplicateNames)
              : formatUnknownAssigneeOption(id);
            return (
              <li key={`${index}-${id}`} className="assignee-list-row">
                <span className="assignee-list-label">{label}</span>
                <span className="assignee-list-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-compact"
                    disabled={index === 0}
                    aria-label={`${label}を前へ`}
                    onClick={() =>
                      onChange(moveAssigneeId(assigneeIds, index, -1))
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-compact"
                    disabled={index === assigneeIds.length - 1}
                    aria-label={`${label}を後へ`}
                    onClick={() =>
                      onChange(moveAssigneeId(assigneeIds, index, 1))
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-compact"
                    aria-label={`${label}を外す`}
                    onClick={() => onChange(removeAssigneeAt(assigneeIds, index))}
                  >
                    外す
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="field assignee-add-field">
        <label htmlFor={`${idPrefix}AssigneeAdd`}>担当を足す</label>
        <select
          id={`${idPrefix}AssigneeAdd`}
          value=""
          disabled={addOptions.length === 0}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            onChange(appendAssigneeId(assigneeIds, id));
          }}
        >
          <option value="">メンバーを選ぶ</option>
          {addOptions.map((member) => (
            <option key={member.id} value={member.id}>
              {memberOptionLabel(member, duplicateNames)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
