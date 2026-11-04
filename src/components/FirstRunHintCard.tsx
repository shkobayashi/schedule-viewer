import { X } from "lucide-react";
import { useEffect } from "react";
import { firstRunHintSaveFootnote } from "../model/firstRunGuidance";

type FirstRunHintCardProps = {
  commandKey: boolean;
  openFileDisabled?: boolean;
  onDismiss: () => void;
  onOpenFile: () => void;
  onOpenGuide: () => void;
  onOpenMcpSettings: () => void;
};

export function FirstRunHintCard({
  commandKey,
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
            <h2 id="first-run-hint-title">サンプルを表示しています</h2>
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
          このあと何をすればよいか、次のどれかから選べます。
        </p>
        <div className="first-run-hint-card__actions">
          <button
            type="button"
            className="first-run-hint-card__btn first-run-hint-card__btn--primary"
            disabled={openFileDisabled}
            onClick={onOpenFile}
          >
            自分の JSON を開く
          </button>
          <button
            type="button"
            className="first-run-hint-card__btn"
            onClick={onOpenGuide}
          >
            操作の案内を読む
          </button>
          <button
            type="button"
            className="first-run-hint-card__btn"
            onClick={onOpenMcpSettings}
          >
            LLM（MCP）とつなぐ
          </button>
        </div>
        <p className="first-run-hint-card__foot">
          {firstRunHintSaveFootnote(commandKey)}
        </p>
      </aside>
    </div>
  );
}
