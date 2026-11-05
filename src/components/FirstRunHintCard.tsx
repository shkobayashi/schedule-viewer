import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  FIRST_RUN_CHECKLIST_LABELS,
  FIRST_RUN_CHECKLIST_ORDER,
  FIRST_RUN_PREPARE_SCHEDULE_TITLE,
  type FirstRunChecklistId,
  type FirstRunChecklistState,
  firstRunHintSaveFootnote,
} from "../model/firstRunGuidance";
import {
  FIRST_RUN_WRITE_SCHEDULE_EXAMPLE_PROMPT,
  WRITE_SCHEDULE_SKILL_NAME,
} from "../model/firstRunLlmSteps";
import {
  FIRST_RUN_TRY_LLM_PROMPT,
  FIRST_RUN_TRY_LLM_UNDO_HINT,
} from "../model/llmRequestExamples";
import { DialogCloseButton } from "./ui/DialogCloseButton";

type FirstRunHintCardProps = {
  commandKey: boolean;
  showingSample: boolean;
  checklist: FirstRunChecklistState;
  showPrepareLlmSteps: boolean;
  hasOpenedScheduleFile: boolean;
  openExistingJsonDisabled?: boolean;
  onDismiss: () => void;
  onPrepareWithLlm: () => void;
  onOpenExistingJson: () => void;
  onOpenGuide: () => void;
  onOpenMcpSettings: () => void;
};

export function FirstRunHintCard({
  commandKey,
  showingSample,
  checklist,
  showPrepareLlmSteps,
  hasOpenedScheduleFile,
  openExistingJsonDisabled = false,
  onDismiss,
  onPrepareWithLlm,
  onOpenExistingJson,
  onOpenGuide,
  onOpenMcpSettings,
}: FirstRunHintCardProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [tryCopyStatus, setTryCopyStatus] = useState<string | null>(null);

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

  useEffect(() => {
    if (!copyStatus) return;
    const timer = window.setTimeout(() => setCopyStatus(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  useEffect(() => {
    if (!tryCopyStatus) return;
    const timer = window.setTimeout(() => setTryCopyStatus(null), 2000);
    return () => window.clearTimeout(timer);
  }, [tryCopyStatus]);

  const actionForId = (id: FirstRunChecklistId): (() => void) => {
    if (id === "guide") return onOpenGuide;
    return onOpenMcpSettings;
  };

  const disabledForId = (id: FirstRunChecklistId): boolean => {
    if (checklist[id]) return true;
    return false;
  };

  const copyExamplePrompt = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(FIRST_RUN_WRITE_SCHEDULE_EXAMPLE_PROMPT);
      setCopyStatus("例文をコピーしました");
    } catch {
      setCopyStatus("コピーできませんでした");
    }
  };

  const copyTryLlmPrompt = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(FIRST_RUN_TRY_LLM_PROMPT);
      setTryCopyStatus("例文をコピーしました");
    } catch {
      setTryCopyStatus("コピーできませんでした");
    }
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
          <DialogCloseButton onClose={onDismiss} />
        </header>
        <p id="first-run-hint-desc" className="first-run-hint-card__lead">
          3 つ終わるまで、ここから続けられます。終わった項目にはチェックが付きます。
        </p>
        <ol className="first-run-hint-card__checklist">
          {FIRST_RUN_CHECKLIST_ORDER.map((id) => {
            const done = checklist[id];
            if (id === "prepareSchedule") {
              const prepareDone = done;
              return (
                <li
                  key={id}
                  className={
                    prepareDone
                      ? "first-run-hint-card__checklist-item first-run-hint-card__checklist-item--done first-run-hint-card__checklist-item--prepare"
                      : "first-run-hint-card__checklist-item first-run-hint-card__checklist-item--prepare"
                  }
                >
                  <span
                    className="first-run-hint-card__check"
                    aria-hidden={!prepareDone}
                  >
                    {prepareDone ? (
                      <Check size={16} strokeWidth={2.5} />
                    ) : null}
                  </span>
                  <div className="first-run-hint-card__prepare">
                    <p className="first-run-hint-card__prepare-title">
                      {FIRST_RUN_PREPARE_SCHEDULE_TITLE}
                    </p>
                    <div className="first-run-hint-card__prepare-actions">
                      <button
                        type="button"
                        className="first-run-hint-card__btn first-run-hint-card__checklist-btn"
                        disabled={prepareDone}
                        onClick={onPrepareWithLlm}
                      >
                        LLM で作る
                      </button>
                      <button
                        type="button"
                        className="first-run-hint-card__btn first-run-hint-card__btn--primary first-run-hint-card__checklist-btn"
                        disabled={
                          (prepareDone && hasOpenedScheduleFile) ||
                          openExistingJsonDisabled
                        }
                        onClick={onOpenExistingJson}
                      >
                        ある JSON を開く
                      </button>
                    </div>
                    {showPrepareLlmSteps ? (
                      <div className="first-run-hint-card__llm-steps">
                        <p className="first-run-hint-card__llm-steps-title">
                          スキルを置いたあと
                        </p>
                        <ol className="first-run-hint-card__llm-steps-list">
                          <li>
                            作業したいフォルダで Claude Code を開く
                          </li>
                          <li>
                            「{WRITE_SCHEDULE_SKILL_NAME}{" "}
                            スキルで、〇〇のスケジュールを作って」のように依頼する
                            <button
                              type="button"
                              className="first-run-hint-card__copy-btn"
                              onClick={() => void copyExamplePrompt()}
                            >
                              例文をコピー
                            </button>
                            {copyStatus ? (
                              <span
                                className="first-run-hint-card__copy-status"
                                role="status"
                              >
                                {copyStatus}
                              </span>
                            ) : null}
                          </li>
                          <li>
                            できた JSON を「ある JSON を開く」で読み込む
                          </li>
                        </ol>
                        <p className="first-run-hint-card__llm-steps-note">
                          メンバーや色なども、LLM に頼めば追加できます
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            }
            if (id === "mcp") {
              return (
                <li
                  key={id}
                  className={
                    done
                      ? "first-run-hint-card__checklist-item first-run-hint-card__checklist-item--done first-run-hint-card__checklist-item--prepare"
                      : "first-run-hint-card__checklist-item first-run-hint-card__checklist-item--prepare"
                  }
                >
                  <span
                    className="first-run-hint-card__check"
                    aria-hidden={!done}
                  >
                    {done ? <Check size={16} strokeWidth={2.5} /> : null}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="first-run-hint-card__btn first-run-hint-card__checklist-btn"
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
                    {done ? (
                      <div className="first-run-hint-card__llm-try">
                        <p className="first-run-hint-card__llm-steps-title">
                          LLM に頼んでみる
                        </p>
                        <p className="first-run-hint-card__llm-try-lead">
                          デスクトップ版で MCP
                          がつながっているとき、タスクを1件選んで Cursor や
                          Claude に次のように頼めます。
                        </p>
                        <p className="first-run-hint-card__llm-try-prompt">
                          {FIRST_RUN_TRY_LLM_PROMPT}
                        </p>
                        <button
                          type="button"
                          className="first-run-hint-card__copy-btn"
                          onClick={() => void copyTryLlmPrompt()}
                        >
                          例文をコピー
                        </button>
                        {tryCopyStatus ? (
                          <span
                            className="first-run-hint-card__copy-status"
                            role="status"
                          >
                            {tryCopyStatus}
                          </span>
                        ) : null}
                        <p className="first-run-hint-card__llm-steps-note">
                          {FIRST_RUN_TRY_LLM_UNDO_HINT}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            }
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
                  className="first-run-hint-card__btn first-run-hint-card__checklist-btn"
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
