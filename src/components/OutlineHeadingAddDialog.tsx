import { useEffect, useMemo, useRef, useState } from "react";
import {
  headingLevelIndices,
  outlineBranchSelectOptions,
} from "../model/outlineCrud";
import type { OutlineRoot, ScheduleId, ScheduleLevelDef } from "../model/types";
import { ModalDialog } from "./ModalDialog";

type ParentSelectOption = { id: ScheduleId; label: string };

type OutlineHeadingAddDialogProps = {
  levels: ScheduleLevelDef[];
  outline?: OutlineRoot | null;
  /** 定義の無い3段ではカテゴリを追加先にする。 */
  categoryParentOptions?: ParentSelectOption[];
  levelCount: number;
  onClose: () => void;
  onSave: (
    levelIndex: number,
    parentBranchId: ScheduleId | null,
    name: string,
  ) => string | null;
};

export function OutlineHeadingAddDialog({
  levels,
  outline = null,
  categoryParentOptions,
  levelCount,
  onClose,
  onSave,
}: OutlineHeadingAddDialogProps) {
  const levelOptions = useMemo(
    () =>
      headingLevelIndices(levelCount).map((levelIndex) => ({
        levelIndex,
        label: levels[levelIndex]?.name ?? "階層",
      })),
    [levelCount, levels],
  );
  const singleHeadingLevel = levelOptions.length === 1;
  const [levelIndex, setLevelIndex] = useState(0);
  const parentOptions = useMemo((): ParentSelectOption[] => {
    if (levelIndex === 0) return [];
    if (categoryParentOptions != null) return categoryParentOptions;
    return outlineBranchSelectOptions(outline ?? [], levelIndex - 1);
  }, [categoryParentOptions, levelIndex, outline]);
  const [parentBranchId, setParentBranchId] = useState<ScheduleId | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => nameRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (levelIndex === 0) {
      setParentBranchId(null);
      return;
    }
    const last =
      parentOptions.length > 0
        ? parentOptions[parentOptions.length - 1]
        : undefined;
    setParentBranchId(last?.id ?? null);
  }, [levelIndex, parentOptions]);

  return (
    <ModalDialog title="見出しを追加" onClose={onClose}>
      {singleHeadingLevel ? null : (
        <div className="field">
          <label htmlFor="outlineHeadingLevel">段</label>
          <select
            id="outlineHeadingLevel"
            value={levelIndex}
            onChange={(event) => {
              setLevelIndex(Number(event.target.value));
              setFormError(null);
            }}
          >
            {levelOptions.map((option) => (
              <option key={option.levelIndex} value={option.levelIndex}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {levelIndex > 0 ? (
        <div className="field">
          <label htmlFor="outlineHeadingParent">追加先</label>
          <select
            id="outlineHeadingParent"
            value={parentBranchId ?? ""}
            onChange={(event) => {
              setParentBranchId(event.target.value);
              setFormError(null);
            }}
          >
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="outlineHeadingName">名前</label>
        <input
          ref={nameRef}
          id="outlineHeadingName"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setFormError(null);
          }}
        />
      </div>
      {formError ? (
        <p className="form-error" role="alert">{formError}</p>
      ) : null}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          キャンセル
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (levelIndex > 0 && parentOptions.length === 0) {
              setFormError("追加先を選んでください");
              return;
            }
            const message = onSave(levelIndex, parentBranchId, name);
            if (message) setFormError(message);
          }}
        >
          追加
        </button>
      </div>
    </ModalDialog>
  );
}
