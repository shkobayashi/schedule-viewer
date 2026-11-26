import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { anchorBelowRect, menuShiftForRect } from "./anchoredMenu";
import type { ColorSelectOption } from "./ColorOptions";

function ColorSwatch({ bg }: { bg: string }) {
  return (
    <span
      className="color-swatch"
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    />
  );
}

function optionLabel(option: ColorSelectOption) {
  return (
    <>
      {option.swatchBg ? <ColorSwatch bg={option.swatchBg} /> : null}
      <span className="color-select-option-text">{option.label}</span>
    </>
  );
}

type ColorSelectFieldProps = {
  id: string;
  value: string;
  options: readonly ColorSelectOption[];
  onChange: (value: string) => void;
};

export function ColorSelectField({
  id,
  value,
  options,
  onChange,
}: ColorSelectFieldProps) {
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState(0);

  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const anchor = anchorBelowRect(buttonRef.current);
    setPosition(anchor);
    setShift({ x: 0, y: 0 });
    const idx = options.findIndex((option) => option.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const next = menuShiftForRect(
      position.left,
      position.top,
      panel.offsetWidth,
      panel.offsetHeight,
    );
    setShift((prev) =>
      prev.x === next.x && prev.y === next.y ? prev : next,
    );
  }, [open, position.left, position.top, options.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
    }
    if (!open) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        options.length === 0 ? 0 : (prev + 1) % options.length,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        options.length === 0
          ? 0
          : (prev - 1 + options.length) % options.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) commit(option.value);
    }
  };

  const activeOptionId =
    open && activeIndex >= 0 && options[activeIndex]
      ? `${listId}-opt-${activeIndex}`
      : undefined;

  return (
    <div className="color-select-field">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="color-select-trigger"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeOptionId}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onButtonKeyDown}
      >
        {selected ? optionLabel(selected) : null}
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="color-select-dropdown"
              style={{
                left: position.left + shift.x,
                top: position.top + shift.y,
              }}
            >
              <ul id={listId} className="color-select-options" role="listbox">
                {options.map((option, index) => (
                  <li key={`${option.value}:${option.label}`}>
                    <button
                      type="button"
                      role="option"
                      id={`${listId}-opt-${index}`}
                      aria-selected={option.value === value}
                      className={
                        index === activeIndex
                          ? "color-select-option is-active"
                          : "color-select-option"
                      }
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(option.value)}
                    >
                      {optionLabel(option)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
