import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { FieldFilterEmptyMode } from "../model/fieldFilters";
import {
  defaultFieldFilterCondition,
  filterFieldsByQuery,
  isFieldFilterActive,
  type FieldFilterCondition,
} from "../model/fieldFilters";
import type { ScheduleFieldDef, ScheduleFilters } from "../model/types";
import { FilterComboDropdown } from "./filterComboDropdown";
import {
  filterSearchListMaxHeightPx,
  readUiScale,
} from "./filterListMetrics";
import { DateInput } from "./DateInput";

const FILTER_FIELD_LIST_MAX_ROWS = 6;

type FilterFieldFiltersSectionProps = {
  scheduleFields: readonly ScheduleFieldDef[];
  filters: ScheduleFilters;
  onPatchFieldFilter: (
    def: ScheduleFieldDef,
    patch: Partial<FieldFilterCondition>,
  ) => void;
  onUpdateFieldFilters: (
    build: (prev: ScheduleFilters) => ScheduleFilters["fieldFilters"],
  ) => void;
};

function initialVisibleFieldKeys(
  scheduleFields: readonly ScheduleFieldDef[],
  filters: ScheduleFilters,
): string[] {
  const fieldFilters = filters.fieldFilters ?? {};
  const keys: string[] = [];
  for (const def of scheduleFields) {
    const condition = fieldFilters[def.key];
    if (condition && isFieldFilterActive(def, condition)) {
      keys.push(def.key);
    }
  }
  return keys;
}

function conditionForKey(
  filters: ScheduleFilters,
  key: string,
): FieldFilterCondition {
  return filters.fieldFilters?.[key] ?? defaultFieldFilterCondition();
}

function FieldFilterRow({
  def,
  filters,
  onPatchFieldFilter,
  onRemove,
}: {
  def: ScheduleFieldDef;
  filters: ScheduleFilters;
  onPatchFieldFilter: (
    def: ScheduleFieldDef,
    patch: Partial<FieldFilterCondition>,
  ) => void;
  onRemove: () => void;
}) {
  const condition = conditionForKey(filters, def.key);
  const setCondition = (patch: Partial<FieldFilterCondition>) => {
    onPatchFieldFilter(def, patch);
  };
  const setEmpty = (empty: FieldFilterEmptyMode) => {
    setCondition({ empty });
  };

  return (
    <div className="filter-field-row">
      <div className="filter-field-row-head">
        <span className="filter-field-name" title={def.name}>{def.name}</span>
        <button
          type="button"
          className="filter-field-remove"
          aria-label={`${def.name} の条件を外す`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRemove}
        >
          外す
        </button>
      </div>
      <div className="filter-field-row-body">
        {def.type === "text" ? (
          <label className="filter-panel-field filter-field-control">
            <span>含む</span>
            <input
              type="text"
              aria-label={`${def.name} を含む`}
              value={condition.text ?? ""}
              onChange={(e) => setCondition({ text: e.target.value })}
            />
          </label>
        ) : null}
        {def.type === "number" ? (
          <div className="filter-field-number-range">
            <label className="filter-panel-field filter-field-control filter-field-control-number">
              <span>以上</span>
              <input
                type="number"
                aria-label={`${def.name} 以上`}
                value={condition.min ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  setCondition({
                    min: raw.length === 0 ? undefined : Number(raw),
                  });
                }}
              />
              {def.percent === true ? (
                <span className="detail-number-suffix">%</span>
              ) : null}
            </label>
            <label className="filter-panel-field filter-field-control filter-field-control-number">
              <span>以下</span>
              <input
                type="number"
                aria-label={`${def.name} 以下`}
                value={condition.max ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  setCondition({
                    max: raw.length === 0 ? undefined : Number(raw),
                  });
                }}
              />
              {def.percent === true ? (
                <span className="detail-number-suffix">%</span>
              ) : null}
            </label>
          </div>
        ) : null}
        {def.type === "date" ? (
          <div className="filter-field-date-range">
            <label className="filter-panel-field filter-field-control filter-field-control-date">
              <span>から</span>
              <DateInput
                id={`filter-field-from-${def.key}`}
                value={condition.from ?? ""}
                onChange={(value) => setCondition({ from: value })}
              />
            </label>
            <label className="filter-panel-field filter-field-control filter-field-control-date">
              <span>まで</span>
              <DateInput
                id={`filter-field-to-${def.key}`}
                value={condition.to ?? ""}
                onChange={(value) => setCondition({ to: value })}
              />
            </label>
          </div>
        ) : null}
        {def.type === "choice" ? (
          <label className="filter-panel-field filter-field-control">
            <span>一致</span>
            <select
              aria-label={def.name}
              value={condition.choice ?? ""}
              onChange={(e) =>
                setCondition({
                  choice: e.target.value.length > 0 ? e.target.value : undefined,
                })
              }
            >
              <option value="">指定しない</option>
              {(def.choices ?? []).map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="filter-panel-field filter-field-control filter-field-empty-control">
          <span>値が無い</span>
          <select
            aria-label={`${def.name} で値が無いタスク`}
            value={condition.empty}
            onChange={(e) => setEmpty(e.target.value as FieldFilterEmptyMode)}
          >
            <option value="any">指定しない</option>
            <option value="keep">残す</option>
            <option value="exclude">除く</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function FilterFieldFiltersSection({
  scheduleFields,
  filters,
  onPatchFieldFilter,
  onUpdateFieldFilters,
}: FilterFieldFiltersSectionProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [listMaxHeight, setListMaxHeight] = useState<number | undefined>(
    undefined,
  );
  const [visibleKeys, setVisibleKeys] = useState(() =>
    initialVisibleFieldKeys(scheduleFields, filters),
  );
  const [clearAnnouncement, setClearAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const prevFieldFiltersRef = useRef(filters.fieldFilters);

  const fieldByKey = useMemo(() => {
    const map = new Map<string, ScheduleFieldDef>();
    for (const def of scheduleFields) map.set(def.key, def);
    return map;
  }, [scheduleFields]);

  const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys]);

  const candidates = useMemo(() => {
    const matched = filterFieldsByQuery(scheduleFields, query);
    return matched.filter((def) => !visibleKeySet.has(def.key));
  }, [query, scheduleFields, visibleKeySet]);

  const showClearFields = visibleKeys.length > 0;

  const addVisibleField = (key: string) => {
    setVisibleKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const removeVisibleField = (key: string) => {
    setVisibleKeys((prev) => prev.filter((item) => item !== key));
    onUpdateFieldFilters((prev) => {
      const next = { ...(prev.fieldFilters ?? {}) };
      delete next[key];
      return next;
    });
  };

  const clearVisibleFields = () => {
    setVisibleKeys([]);
    onUpdateFieldFilters(() => ({}));
    setClearAnnouncement("");
    queueMicrotask(() => setClearAnnouncement("追加項目の条件を外しました"));
    inputRef.current?.focus();
  };

  useEffect(() => {
    const prev = prevFieldFiltersRef.current ?? {};
    const next = filters.fieldFilters ?? {};
    setVisibleKeys((keys) =>
      keys.filter((key) => {
        const def = fieldByKey.get(key);
        if (!def) return false;
        const wasActive =
          prev[key] != null && isFieldFilterActive(def, prev[key]);
        const stillThere = next[key] != null;
        if (wasActive && !stillThere) return false;
        return true;
      }),
    );
    prevFieldFiltersRef.current = next;
  }, [fieldByKey, filters.fieldFilters]);

  const updateListMaxHeight = () => {
    const input = inputRef.current;
    if (!input) return;
    const bottom = input.getBoundingClientRect().bottom + 4 * readUiScale();
    setListMaxHeight(
      filterSearchListMaxHeightPx(bottom, FILTER_FIELD_LIST_MAX_ROWS),
    );
  };

  useLayoutEffect(() => {
    if (!listOpen) return;
    updateListMaxHeight();
    const onResize = () => updateListMaxHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [listOpen, query]);

  useLayoutEffect(() => {
    if (!listOpen || !listRef.current) return;
    const list = listRef.current;
    const row = list.querySelector<HTMLElement>(
      `[data-field-index="${activeIndex}"]`,
    );
    if (!row) return;
    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    if (rowTop < list.scrollTop) {
      list.scrollTop = rowTop;
    } else if (rowBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = rowBottom - list.clientHeight;
    }
  }, [activeIndex, listOpen, candidates.length]);

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const composing =
      event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;

    if (event.key === "ArrowDown") {
      if (composing) return;
      event.preventDefault();
      event.stopPropagation();
      if (!listOpen) {
        setActiveIndex(0);
        setListOpen(true);
        return;
      }
      setActiveIndex((prev) =>
        Math.min(prev + 1, Math.max(candidates.length - 1, 0)),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      if (composing) return;
      event.preventDefault();
      event.stopPropagation();
      if (!listOpen) {
        setActiveIndex(Math.max(candidates.length - 1, 0));
        setListOpen(true);
        return;
      }
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      if (composing) return;
      if (!listOpen) return;
      event.preventDefault();
      event.stopPropagation();
      const def = candidates[activeIndex];
      if (def) addVisibleField(def.key);
      return;
    }
    if (event.key === "Escape" && listOpen) {
      event.preventDefault();
      event.stopPropagation();
      setListOpen(false);
    }
  };

  const activeOptionId =
    listOpen && candidates[activeIndex]
      ? `${listId}-opt-${activeIndex}`
      : undefined;

  if (scheduleFields.length === 0) return null;

  const visibleDefs = visibleKeys
    .map((key) => fieldByKey.get(key))
    .filter((def): def is ScheduleFieldDef => def != null);

  return (
    <div className="filter-panel-field filter-panel-field-filters filter-panel-field-span">
      <div className="filter-panel-tag-heading">
        <label className="filter-panel-tag-label" htmlFor={inputId}>
          追加項目
        </label>
        {showClearFields ? (
          <button
            type="button"
            className="filter-clear-all"
            aria-label="追加項目の条件を外す"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearVisibleFields}
          >
            選択を外す
          </button>
        ) : null}
      </div>
      <div className="filter-panel-sr-only" role="status" aria-live="polite">
        {clearAnnouncement}
      </div>
      <div className="filter-panel-tag-combo" ref={comboRef}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="filter-panel-tag-input"
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          placeholder="項目名で検索"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setListOpen(true);
          }}
          onFocus={() => setListOpen(true)}
          onBlur={() => setListOpen(false)}
          onClick={() => {
            if (!listOpen) setListOpen(true);
          }}
          onKeyDown={onInputKeyDown}
        />
        <FilterComboDropdown open={listOpen} anchorRef={inputRef}>
          <ul
            id={listId}
            ref={listRef}
            className="filter-panel-tag-options"
            role="listbox"
            style={
              listMaxHeight != null ? { maxHeight: listMaxHeight } : undefined
            }
          >
            {candidates.length > 0 ? (
              candidates.map((def, index) => {
                const active = index === activeIndex;
                return (
                  <li
                    key={def.key}
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={active}
                    data-field-index={index}
                    className={
                      active
                        ? "filter-panel-field-option filter-panel-field-option-active"
                        : "filter-panel-field-option"
                    }
                    title={def.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => addVisibleField(def.key)}
                  >
                    <span className="filter-panel-field-option-label">
                      {def.name}
                    </span>
                  </li>
                );
              })
            ) : (
              <li
                className="filter-panel-tag-none"
                role="status"
                aria-live="polite"
              >
                該当する項目はありません
              </li>
            )}
          </ul>
        </FilterComboDropdown>
      </div>
      {visibleDefs.length > 0 ? (
        <div className="filter-field-rows">
          {visibleDefs.map((def) => (
            <FieldFilterRow
              key={def.key}
              def={def}
              filters={filters}
              onPatchFieldFilter={onPatchFieldFilter}
              onRemove={() => removeVisibleField(def.key)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
