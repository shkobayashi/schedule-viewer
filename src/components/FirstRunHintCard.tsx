import { Check, X } from "lucide-react";
import { useEffect } from "react";
import {
  FIRST_RUN_CHECKLIST_LABELS,
  FIRST_RUN_CHECKLIST_ORDER,
  type FirstRunChecklistId,
  type FirstRunChecklistState,
  firstRunHintSaveFootnote,
} from "../model/firstRunGuidance";

type FirstRunHintCardProps = {
  commandKey: boolean;
  showingSample: boolean;
  checklist: FirstRunChecklistState;
  openFileDisabled?: boolean;
  onDismiss: () => void;
  onOpenFile: () => void;
  onOpenGuide: () => void;
  onOpenMcpSettings: () => void;
};

export function FirstRunHintCard({
  commandKey,
  showingSample,
  checklist,
  openFileDisabled = false,
  onDismiss,
  onOpenFile,
  onOpenGuide,
  onOpenMcpSettings,
}: FirstRunHintCardProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onDismiss]);

  const actionForId = (id: FirstRunChecklistId): (() => void) => {
    if (id === "openFile") return onOpenFile;
    if (id === "guide") return onOpenGuide;
    return onOpenMcpSettings;
  };

  const disabledForId = (id: FirstRunChecklistId): boolean => {
    if (checklist[id]) return true;
    if (id === "openFile") return openFileDisabled;
    return false;
  };

  return (
    <div className="first-run-hint-layer" role="presentation">
      <aside
        className="first-run-hint-card"
        role="dialog"
        aria-labelledby="first-run-hint-title"
        aria-describedby="first-run-hint-desc"
      >
        <header className="first-run-hint-card__head">
          <div>
            <p className="first-run-hint-card__eyebrow">はじめての起動</p>
            <h2 id="first-run-hint-title">
              {showingSample
                ? "サンプルを表示しています"
                : "次の 3 つを終えましょう"}
            </h2>
          </div>
          <button
            type="button"
            className="first-run-hint-card__close icon-btn"
            aria-label="閉じる"
            onClick={onDismiss}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <p id="first-run-hint-desc" className="first-run-hint-card__lead">
          3 つ終わるまで、ここから続けられます。終わった項目にはチェックが付きます。
        </p>
        <ol className="first-run-hint-card__checklist">
          {FIRST_RUN_CHECKLIST_ORDER.map((id) => {
            const done = checklist[id];
            return (
              <li
                key={id}
                className={
                  done
                    ? "first-run-hint-card__checklist-item first-run-hint-card__checklist-item--done"
                    : "first-run-hint-card__checklist-item"
                }
              >
                <span
                  className="first-run-hint-card__check"
                  aria-hidden={!done}
                >
                  {done ? <Check size={16} strokeWidth={2.5} /> : null}
                </span>
                <button
                  type="button"
                  className={
                    id === "openFile"
                      ? "first-run-hint-card__btn first-run-hint-card__btn--primary first-run-hint-card__checklist-btn"
                      : "first-run-hint-card__btn first-run-hint-card__checklist-btn"
                  }
                  disabled={disabledForId(id)}
                  aria-label={
                    done
                      ? `${FIRST_RUN_CHECKLIST_LABELS[id]}（完了）`
                      : FIRST_RUN_CHECKLIST_LABELS[id]
                  }
                  onClick={actionForId(id)}
                >
                  {FIRST_RUN_CHECKLIST_LABELS[id]}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="first-run-hint-card__foot">
          {firstRunHintSaveFootnote(commandKey)}
        </p>
      </aside>
    </div>
  );
}
