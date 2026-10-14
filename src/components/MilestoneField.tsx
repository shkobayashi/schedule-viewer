import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  buildMilestoneFieldList,
  initialMilestoneFieldActiveIndex,
  milestoneFieldClosedLabel,
  milestoneIdFromFieldOption,
  stepMilestoneFieldActiveIndex,
  type MilestoneFieldOption,
} from "../model/milestoneField";
import type { Milestone, ScheduleId } from "../model/types";

type MilestoneFieldProps = {
  id: string;
  milestones: Milestone[];
  value: ScheduleId | null;
  onChange: (milestoneId: ScheduleId | null) => void;
};

export function MilestoneField({
  id,
  milestones,
  value,
  onChange,
}: MilestoneFieldProps) {
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [inputText, setInputText] = useState(() =>
    milestoneFieldClosedLabel(value, milestones),
  );
  const [typing, setTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const closedLabel = useMemo(
    () => milestoneFieldClosedLabel(value, milestones),
    [milestones, value],
  );

  const listState = useMemo(
    () => buildMilestoneFieldList(milestones, filterQuery),
    [filterQuery, milestones],
  );

  const syncActiveToList = (query: string) => {
    const list = buildMilestoneFieldList(milestones, query);
    setActiveIndex(initialMilestoneFieldActiveIndex(value, list, query));
  };

  useEffect(() => {
    if (open) return;
    setInputText(closedLabel);
    setFilterQuery("");
    setTyping(false);
  }, [closedLabel, open]);

  useLayoutEffect(() => {
    if (!open || !listRef.current || activeIndex < 0) return;
    if (listState.options.length === 0) return;
    const list = listRef.current;
    const row = list.querySelector<HTMLElement>(
      `[data-milestone-option="${activeIndex}"]`,
    );
    if (!row) return;
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top < listRect.top) {
      list.scrollTop -= listRect.top - rowRect.top;
    } else if (rowRect.bottom > listRect.bottom) {
      list.scrollTop += rowRect.bottom - listRect.bottom;
    }
  }, [activeIndex, listState.options.length, open]);

  const selectAllInput = () => {
    const input = inputRef.current;
    if (!input) return;
    input.setSelectionRange(0, input.value.length);
  };

  const commitOption = (option: MilestoneFieldOption) => {
    const next = milestoneIdFromFieldOption(option);
    onChange(next);
    setOpen(false);
    setFilterQuery("");
    setTyping(false);
    setInputText(milestoneFieldClosedLabel(next, milestones));
  };

  const onFocus = () => {
    setOpen(true);
    setFilterQuery("");
    setTyping(false);
    setInputText(closedLabel);
    syncActiveToList("");
    queueMicrotask(() => selectAllInput());
  };

  const onBlur = () => {
    setOpen(false);
    setFilterQuery("");
    setTyping(false);
    setInputText(closedLabel);
  };

  const onInputChange = (text: string) => {
    setTyping(true);
    setFilterQuery(text);
    setInputText(text);
    setOpen(true);
    syncActiveToList(text);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const composing =
      event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;

    if (!typing && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      selectAllInput();
      return;
    }

    if (event.key === "ArrowDown") {
      if (composing) return;
      event.preventDefault();
      event.stopPropagation();
      if (!open) {
        setOpen(true);
        syncActiveToList(filterQuery);
        return;
      }
      setActiveIndex((prev) =>
        stepMilestoneFieldActiveIndex(
          prev,
          listState.options.length,
          "down",
        ),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      if (composing) return;
      event.preventDefault();
      event.stopPropagation();
      if (!open) {
        setOpen(true);
        syncActiveToList(filterQuery);
        return;
      }
      setActiveIndex((prev) =>
        stepMilestoneFieldActiveIndex(prev, listState.options.length, "up"),
      );
      return;
    }
    if (event.key === "Enter") {
      if (composing) return;
      if (!open) return;
      event.preventDefault();
      event.stopPropagation();
      if (listState.noMatches || activeIndex < 0) return;
      const option = listState.options[activeIndex];
      if (option) commitOption(option);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setFilterQuery("");
      setTyping(false);
      setInputText(closedLabel);
      queueMicrotask(() => selectAllInput());
    }
  };

  const activeOptionId =
    open && activeIndex >= 0 && listState.options[activeIndex]
      ? `${listId}-opt-${activeIndex}`
      : undefined;

  const listboxId =
    open && listState.options.length > 0 ? listId : undefined;

  return (
    <div className="relation-combo milestone-field-combo">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        spellCheck={false}
        value={inputText}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onMouseDown={(e) => {
          if (!typing && open) e.preventDefault();
        }}
        onClick={() => {
          if (!typing) selectAllInput();
        }}
        onKeyDown={onInputKeyDown}
      />
      {open ? (
        <>
          {listState.options.length > 0 ? (
            <ul
              id={listId}
              ref={listRef}
              className="relation-options"
              role="listbox"
            >
              {listState.options.map((option, index) => (
                <li key={optionKey(option)}>
                  <button
                    type="button"
                    role="option"
                    id={`${listId}-opt-${index}`}
                    data-milestone-option={index}
                    aria-selected={index === activeIndex}
                    className={index === activeIndex ? "active" : undefined}
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commitOption(option)}
                  >
                    {optionLabel(option)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {listState.noMatches ? (
            <p className="relation-none" role="status" aria-live="polite">
              一致するマイルストンがありません
            </p>
          ) : null}
          {listState.truncated ? (
            <p className="relation-none" role="status" aria-live="polite">
              さらに絞り込んでください
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function optionKey(option: MilestoneFieldOption): string {
  if (option.kind === "none") return "none";
  return option.id;
}

function optionLabel(option: MilestoneFieldOption): string {
  return option.kind === "none" ? "なし" : option.label;
}
