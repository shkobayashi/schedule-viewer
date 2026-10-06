import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { acquireBackgroundInert } from "./backgroundInert";
import {
  buildCommandPaletteItems,
  commandPaletteActiveIndex,
  filterCommandPaletteItems,
  moveCommandPaletteHighlight,
  type CommandPaletteCommandId,
  type CommandPaletteContext,
} from "../model/commandPalette";

type CommandPaletteProps = {
  open: boolean;
  context: CommandPaletteContext;
  onClose: () => void;
  onRun: (id: CommandPaletteCommandId) => void;
};

export function CommandPalette({
  open,
  context,
  onClose,
  onRun,
}: CommandPaletteProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const allItems = useMemo(
    () => buildCommandPaletteItems(context),
    [context],
  );
  const items = useMemo(
    () => filterCommandPaletteItems(allItems, query),
    [allItems, query],
  );
  const activeIndex = commandPaletteActiveIndex(items, highlight);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const releaseInert = acquireBackgroundInert();
    return () => releaseInert();
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open) return null;

  const runHighlighted = () => {
    const item = items[activeIndex];
    if (item == null || !item.enabled) return;
    onRun(item.id);
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay command-palette-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-command-palette=""
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
          return;
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          !event.shiftKey &&
          !event.altKey &&
          event.key.toLowerCase() === "k"
        ) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setHighlight((current) => moveCommandPaletteHighlight(current, 1, items.length));
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setHighlight((current) =>
            moveCommandPaletteHighlight(current, -1, items.length),
          );
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          runHighlighted();
        }
      }}
    >
      <div className="command-palette" tabIndex={-1}>
        <h2 id={titleId} className="command-palette-title">
          コマンド
        </h2>
        <input
          ref={inputRef}
          type="search"
          className="command-palette-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((current) =>
                moveCommandPaletteHighlight(
                  current,
                  event.key === "ArrowDown" ? 1 : -1,
                  items.length,
                ),
              );
            }
            if (event.key === "Enter") {
              event.preventDefault();
              runHighlighted();
            }
          }}
          aria-controls={`${titleId}-list`}
          aria-activedescendant={
            activeIndex >= 0 ? `${titleId}-item-${activeIndex}` : undefined
          }
          placeholder="コマンドを検索"
          autoComplete="off"
          spellCheck={false}
        />
        <ul
          ref={listRef}
          id={`${titleId}-list`}
          className="command-palette-list"
          role="listbox"
        >
          {items.length === 0 ? (
            <li className="command-palette-empty">一致するコマンドがありません</li>
          ) : (
            items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  id={`${titleId}-item-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className="command-palette-item"
                  disabled={!item.enabled}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => {
                    if (!item.enabled) return;
                    onRun(item.id);
                    onClose();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
