import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ScheduleDiffEntry } from "../model/scheduleDiffEntry";
import { diffEntryBody } from "../model/scheduleDiffEntry";
import type { DiffStripView } from "../model/diffStripVisibility";

type DiffStripProps = {
  view: Extract<DiffStripView, { visible: true }>;
  entries: ScheduleDiffEntry[];
  expanded: boolean;
  activeIndex: number;
  rowStatus: string | null;
  rowHeight: number;
  onExpandFromPointer: () => void;
  onExpandFromKeyboard: () => void;
  onCollapse: () => void;
  onClose: () => void;
  onCopy: () => void;
  copyDisabled: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  onFocus: () => void;
  onBlur: () => void;
  onActiveIndexChange: (index: number, navigate: boolean) => void;
  focusListOnMount: boolean;
  onFocusListDone: () => void;
};

function DiffStripRow({
  entry,
  index,
  isActive,
  rowStatus,
  rowStyle,
  onActiveIndexChange,
  setRowRef,
}: {
  entry: ScheduleDiffEntry;
  index: number;
  isActive: boolean;
  rowStatus: string | null;
  rowStyle: { minHeight: number; height: number };
  onActiveIndexChange: (index: number, navigate: boolean) => void;
  setRowRef: (index: number, el: HTMLButtonElement | null) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isDelete = entry.badge === "削除";
  const body = diffEntryBody(entry.text);

  return (
    <div className="diff-strip-item">
      <button
        ref={(el) => {
          buttonRef.current = el;
          setRowRef(index, el);
        }}
        id={`diff-row-${index}`}
        type="button"
        role="option"
        aria-selected={isActive}
        className={`diff-strip-row${isActive ? " diff-strip-row--active" : ""}`}
        style={rowStyle}
        onClick={() => onActiveIndexChange(index, true)}
      >
        <span
          className={`diff-strip-badge${isDelete ? " diff-strip-badge--delete" : ""}`}
        >
          {entry.badge}
        </span>
        <span className="diff-strip-row-name">{entry.summaryName}</span>
        {entry.location ? (
          <DiffStripRowPlace location={entry.location} buttonRef={buttonRef} />
        ) : null}
      </button>
      {isActive && body ? (
        <pre className="diff-strip-row-body" aria-label="差分の詳細">
          {body}
        </pre>
      ) : null}
      {isActive && rowStatus ? (
        <p className="diff-strip-row-status" role="status">{rowStatus}</p>
      ) : null}
    </div>
  );
}

function DiffStripRowPlace({
  location,
  buttonRef,
}: {
  location: string;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const probeRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const probe = probeRef.current;
    if (!button || !probe) {
      setVisible(false);
      return;
    }
    const name = button.querySelector(".diff-strip-row-name");
    const badge = button.querySelector(".diff-strip-badge");
    const used =
      (badge instanceof HTMLElement ? badge.offsetWidth : 0) +
      (name instanceof HTMLElement ? name.offsetWidth : 0) +
      12;
    setVisible(used + probe.offsetWidth <= button.clientWidth);
  }, [location, buttonRef]);

  return (
    <>
      <span
        ref={probeRef}
        className="diff-strip-row-place diff-strip-row-place--probe"
        aria-hidden={true}
      >
        {location}
      </span>
      {visible ? (
        <span className="diff-strip-row-place">{location}</span>
      ) : null}
    </>
  );
}

export function DiffStrip({
  view,
  entries,
  expanded,
  activeIndex,
  rowStatus,
  rowHeight,
  onExpandFromPointer,
  onExpandFromKeyboard,
  onCollapse,
  onClose,
  onCopy,
  copyDisabled,
  listRef,
  onFocus,
  onBlur,
  onActiveIndexChange,
  focusListOnMount,
  onFocusListDone,
}: DiffStripProps) {
  const headingId = useId();
  const handleRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!focusListOnMount || !expanded || view.kind !== "body") return;
    const list = listRef.current;
    if (!list) return;
    list.focus();
    onFocusListDone();
  }, [expanded, focusListOnMount, listRef, onFocusListDone, view.kind]);

  useEffect(() => {
    if (!expanded || view.kind !== "body") return;
    const row = rowRefs.current[activeIndex];
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, expanded, view.kind]);

  const onListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (view.kind !== "body" || entries.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = Math.min(entries.length - 1, activeIndex + 1);
        if (next !== activeIndex) onActiveIndexChange(next, false);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const next = Math.max(0, activeIndex - 1);
        if (next !== activeIndex) onActiveIndexChange(next, false);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        onActiveIndexChange(activeIndex, true);
      }
    },
    [activeIndex, entries.length, onActiveIndexChange, view.kind],
  );

  const compact = view.kind === "empty";
  const showCollapsedHandle = !expanded && view.kind === "body";
  const rowStyle = { minHeight: rowHeight, height: rowHeight };

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
      {view.kind === "empty" ? (
        <textarea
          className="diff-strip-textarea"
          readOnly
          rows={1}
          value={view.text}
          aria-label="差分テキスト"
        />
      ) : (
        <div
          ref={listRef}
          className="diff-strip-list"
          tabIndex={0}
          role="listbox"
          aria-label="差分の一覧"
          aria-activedescendant={
            entries.length > 0 ? `diff-row-${activeIndex}` : undefined
          }
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onListKeyDown}
        >
          {entries.map((entry, index) => (
            <DiffStripRow
              key={`${index}:${entry.summaryName}`}
              entry={entry}
              index={index}
              isActive={index === activeIndex}
              rowStatus={index === activeIndex ? rowStatus : null}
              rowStyle={rowStyle}
              onActiveIndexChange={onActiveIndexChange}
              setRowRef={(rowIndex, el) => {
                rowRefs.current[rowIndex] = el;
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
