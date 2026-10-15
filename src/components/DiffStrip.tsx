import { useEffect, useId, useRef } from "react";
import type { DiffStripView } from "../model/diffStripVisibility";

type DiffStripProps = {
  view: Extract<DiffStripView, { visible: true }>;
  expanded: boolean;
  onExpandFromPointer: () => void;
  onExpandFromKeyboard: () => void;
  onCollapse: () => void;
  onClose: () => void;
  onCopy: () => void;
  copyDisabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onFocus: () => void;
  onBlur: () => void;
  selectAllOnMount: boolean;
  onSelectAllDone: () => void;
};

export function DiffStrip({
  view,
  expanded,
  onExpandFromPointer,
  onExpandFromKeyboard,
  onCollapse,
  onClose,
  onCopy,
  copyDisabled,
  textareaRef,
  onFocus,
  onBlur,
  selectAllOnMount,
  onSelectAllDone,
}: DiffStripProps) {
  const headingId = useId();
  const handleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectAllOnMount || !expanded) return;
    const area = textareaRef.current;
    if (!area) return;
    area.focus();
    area.select();
    onSelectAllDone();
  }, [expanded, onSelectAllDone, selectAllOnMount, textareaRef, view.text]);

  const compact = view.kind === "empty";
  const showCollapsedHandle = !expanded && view.kind === "body";

  if (showCollapsedHandle) {
    return (
      <aside className="diff-strip diff-strip--collapsed">
        <button
          ref={handleRef}
          type="button"
          className="diff-strip-handle"
          title="差分を開く"
          aria-expanded={false}
          onClick={onExpandFromPointer}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onExpandFromKeyboard();
          }}
        >
          差分
        </button>
      </aside>
    );
  }

  return (
    <section
      className={`diff-strip diff-strip--open${compact ? " diff-strip--empty" : ""}`}
      role="region"
      aria-labelledby={headingId}
    >
      <div className="diff-strip-header">
        <h2 id={headingId} className="diff-strip-title">差分</h2>
        <div className="diff-strip-actions">
          <button
            type="button"
            className="diff-strip-btn"
            onClick={onCopy}
            disabled={copyDisabled}
          >
            コピー
          </button>
          {view.showClose ? (
            <button type="button" className="diff-strip-btn" onClick={onClose}>
              閉じる
            </button>
          ) : (
            <button
              type="button"
              className="diff-strip-btn"
              onClick={onCollapse}
              aria-expanded={true}
            >
              畳む
            </button>
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        className="diff-strip-textarea"
        readOnly
        rows={compact ? 1 : undefined}
        value={view.text}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label="差分テキスト"
      />
    </section>
  );
}
