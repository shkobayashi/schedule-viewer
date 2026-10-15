import { useEffect, useId, useRef } from "react";
import type { DiffStripView } from "../model/diffStripVisibility";

type DiffStripProps = {
  view: Extract<DiffStripView, { visible: true }>;
  onClose: () => void;
  onCopy: () => void;
  copyDisabled: boolean;
  onHeightChange: (height: number) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onFocus: () => void;
  onBlur: () => void;
  selectAllOnMount: boolean;
  onSelectAllDone: () => void;
};

export function DiffStrip({
  view,
  onClose,
  onCopy,
  copyDisabled,
  onHeightChange,
  textareaRef,
  onFocus,
  onBlur,
  selectAllOnMount,
  onSelectAllDone,
}: DiffStripProps) {
  const headingId = useId();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const report = () => onHeightChange(node.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onHeightChange, view.text, view.kind, view.showClose]);

  useEffect(() => {
    if (!selectAllOnMount) return;
    const area = textareaRef.current;
    if (!area) return;
    area.focus();
    area.select();
    onSelectAllDone();
  }, [onSelectAllDone, selectAllOnMount, textareaRef]);

  const compact = view.kind === "empty";

  return (
    <section
      ref={rootRef}
      className={`diff-strip${compact ? " diff-strip--empty" : ""}`}
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
          ) : null}
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
