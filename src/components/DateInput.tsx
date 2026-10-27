import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { isIsoDateString, parseDate, todayIso } from "../model/dates";
import { monthCells, placeDatePopover } from "./datePopover";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type DateInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
};

type MonthCursor = { year: number; month: number };

function monthCursor(value: string): MonthCursor {
  const iso = isIsoDateString(value) ? value : todayIso();
  const date = parseDate(iso);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function shiftMonth(cursor: MonthCursor, delta: number): MonthCursor {
  const date = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function DateInput({ id, value, onChange }: DateInputProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const shown = draft ?? value;

  return (
    <div className="date-input" ref={anchorRef}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={shown}
        onFocus={() => setDraft(value)}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (isIsoDateString(next) && next !== value) onChange(next);
        }}
        onBlur={() => {
          const next = (draft ?? value).trim();
          setDraft(null);
          if (next === value) return;
          if (next === "" || isIsoDateString(next)) onChange(next);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" || !event.altKey) return;
          event.preventDefault();
          setOpen(true);
        }}
      />
      <button
        ref={buttonRef}
        type="button"
        className="date-input-button"
        aria-label="カレンダーを開く"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Calendar />
      </button>
      {open ? (
        <DatePopover
          id={popoverId}
          anchorRef={anchorRef}
          value={value}
          onSelect={(next) => {
            setDraft(null);
            if (next !== value) onChange(next);
            setOpen(false);
            buttonRef.current?.focus();
          }}
          onClose={(restoreFocus) => {
            setOpen(false);
            if (restoreFocus) buttonRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

function DatePopover({
  id,
  anchorRef,
  value,
  onSelect,
  onClose,
}: {
  id: string;
  anchorRef: RefObject<HTMLDivElement | null>;
  value: string;
  onSelect: (value: string) => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(() => monthCursor(value));
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const today = todayIso();
  const cells = monthCells(cursor.year, cursor.month);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const pop = popRef.current;
    if (!anchor || !pop) return;
    const rect = anchor.getBoundingClientRect();
    const next = placeDatePopover(
      rect.left,
      rect.top,
      rect.bottom,
      pop.offsetWidth,
      pop.offsetHeight,
    );
    setPos((prev) =>
      prev && prev.left === next.left && prev.top === next.top ? prev : next,
    );
  }, [anchorRef]);

  useLayoutEffect(() => {
    place();
  }, [place, cursor.year, cursor.month]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target) || popRef.current?.contains(target)) {
        return;
      }
      onCloseRef.current(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current(true);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef, place]);

  return createPortal(
    <div
      ref={popRef}
      id={id}
      className="date-popover"
      aria-label="日付を選ぶ"
      style={
        pos
          ? { left: pos.left, top: pos.top }
          : { left: 0, top: 0, visibility: "hidden" }
      }
    >
      <div className="date-popover-head">
        <button
          type="button"
          className="date-popover-nav"
          aria-label="前の月"
          onClick={() => setCursor((prev) => shiftMonth(prev, -1))}
        >
          <ChevronLeft />
        </button>
        <span className="date-popover-title">
          {cursor.year}年{cursor.month + 1}月
        </span>
        <button
          type="button"
          className="date-popover-nav"
          aria-label="次の月"
          onClick={() => setCursor((prev) => shiftMonth(prev, 1))}
        >
          <ChevronRight />
        </button>
      </div>
      <div className="date-popover-weekdays">
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="date-popover-grid">
        {cells.map((cell, index) =>
          cell == null ? (
            <span key={`empty-${index}`} />
          ) : (
            <button
              key={cell.iso}
              type="button"
              className={
                cell.iso === value
                  ? "date-popover-day is-selected"
                  : cell.iso === today
                    ? "date-popover-day is-today"
                    : "date-popover-day"
              }
              aria-label={`${cursor.year}年${cursor.month + 1}月${cell.day}日`}
              aria-pressed={cell.iso === value}
              onClick={() => onSelect(cell.iso)}
            >
              {cell.day}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        className="date-popover-clear"
        onClick={() => onSelect("")}
      >
        クリア
      </button>
    </div>,
    document.body,
  );
}
