import { StatusOptions } from "./StatusOptions";
import type { StatusItem } from "../model/statusCatalog";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  buildMilestoneFilterList,
  initialMilestoneFilterActiveIndex,
  milestoneFilterClosedLabel,
  milestoneFilterValueFromOption,
  stepMilestoneFieldActiveIndex,
  type MilestoneFilterListState,
  type MilestoneFilterOption,
} from "../model/milestoneField";
import { filterTagsByQuery } from "../model/taskTags";
import {
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
  type ConfidenceFilter,
  type Milestone,
  type MilestoneGroup,
  type ScheduleId,
  type OverdueFilter,
  type RelationFilter,
  type ScheduleFilters,
  type StatusFilter,
} from "../model/types";
import { anchorBelowRect, menuShiftForRect } from "./anchoredMenu";
import type { AssigneeFilterOption } from "./Toolbar";

const FILTER_TAG_LIST_MAX_ROWS = 6;

function readScale(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--s");
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function filterTagListMaxHeightPx(anchorBottom: number): number {
  const s = readScale();
  const row = 18 * s;
  const gap = 4 * s;
  const pad = 4 * s;
  const borderY = 2;
  const fullMax =
    pad * 2 +
    FILTER_TAG_LIST_MAX_ROWS * row +
    (FILTER_TAG_LIST_MAX_ROWS - 1) * gap +
    borderY;
  const oneRow = pad * 2 + row + borderY;
  const available = window.innerHeight - anchorBottom - 8 * s;
  return Math.max(oneRow, Math.min(fullMax, available));
}

function filterMilestoneStatusHeightPx(): number {
  const s = readScale();
  return 6 * s * 2 + 13 * s * 1.5 + 1;
}

function filterMilestoneDropdownMaxHeightPx(
  anchorBottom: number,
  listState: MilestoneFilterListState,
): number {
  const listBudget = filterTagListMaxHeightPx(anchorBottom);
  let extra = 0;
  if (listState.noMatches || listState.truncated) {
    extra += filterMilestoneStatusHeightPx();
  }
  return listBudget + extra;
}

type FilterTagFieldProps = {
  scheduleTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
};

function FilterTagField({
  scheduleTags,
  selectedTags,
  onTagsChange,
}: FilterTagFieldProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [listMaxHeight, setListMaxHeight] = useState<number | undefined>(
    undefined,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [clearAnnouncement, setClearAnnouncement] = useState("");

  const candidates = useMemo(
    () => filterTagsByQuery(scheduleTags, query),
    [scheduleTags, query],
  );

  const toggleTag = (tag: string) => {
    const selected = new Set(selectedTags);
    if (selected.has(tag)) selected.delete(tag);
    else selected.add(tag);
    onTagsChange(scheduleTags.filter((item) => selected.has(item)));
  };

  const clearSelectedTags = () => {
    onTagsChange([]);
    setClearAnnouncement("");
    queueMicrotask(() => setClearAnnouncement("タグの選択を外しました"));
    inputRef.current?.focus();
  };

  const updateListMaxHeight = () => {
    const combo = comboRef.current;
    if (!combo) return;
    const input = inputRef.current;
    const bottom = input
      ? input.getBoundingClientRect().bottom + 4 * readScale()
      : combo.getBoundingClientRect().bottom;
    setListMaxHeight(filterTagListMaxHeightPx(bottom));
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
      `[data-tag-index="${activeIndex}"]`,
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
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(candidates.length - 1, 0)));
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
      const tag = candidates[activeIndex];
      if (tag) toggleTag(tag);
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

  const showClearTags = selectedTags.length > 0;

  return (
    <div className="filter-panel-field filter-panel-tags filter-panel-field-span">
      <div className="filter-panel-tag-heading">
        <label className="filter-panel-tag-label" htmlFor={inputId}>タグ</label>
        {showClearTags ? (
          <button
            type="button"
            className="filter-clear-all"
            aria-label="タグの選択を外す"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearSelectedTags}
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
          placeholder="タグ名で検索"
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
        {listOpen ? (
          <ul
            id={listId}
            ref={listRef}
            className="filter-panel-tag-options"
            role="listbox"
            aria-multiselectable="true"
            style={
              listMaxHeight != null ? { maxHeight: listMaxHeight } : undefined
            }
          >
            {candidates.length > 0 ? (
              candidates.map((tag, index) => {
                const checked = selectedTags.includes(tag);
                const active = index === activeIndex;
                return (
                  <li
                    key={tag}
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={checked}
                    data-tag-index={index}
                    className={
                      active
                        ? "filter-panel-tag-option filter-panel-tag-option-active"
                        : "filter-panel-tag-option"
                    }
                    title={tag}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => toggleTag(tag)}
                  >
                    <span className="filter-panel-tag-option-check" aria-hidden="true">
                      <input type="checkbox" readOnly tabIndex={-1} checked={checked} />
                    </span>
                    <span className="filter-panel-tag-option-label">{tag}</span>
                  </li>
                );
              })
            ) : (
              <li
                className="filter-panel-tag-none"
                role="status"
                aria-live="polite"
              >
                該当するタグはありません
              </li>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

type FilterMilestoneFieldProps = {
  filterValue: string;
  milestones: Milestone[];
  onMilestoneChange: (value: string) => void;
};

function filterMilestoneOptionLabel(option: MilestoneFilterOption): string {
  if (option.kind === "all") return "すべて";
  if (option.kind === "none") return "なし";
  return option.label;
}

function filterMilestoneOptionKey(option: MilestoneFilterOption): string {
  if (option.kind === "all") return "all";
  if (option.kind === "none") return "none";
  return option.id;
}

function FilterMilestoneField({
  filterValue,
  milestones,
  onMilestoneChange,
}: FilterMilestoneFieldProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [inputText, setInputText] = useState(() =>
    milestoneFilterClosedLabel(filterValue, milestones),
  );
  const [typing, setTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [listMaxHeight, setListMaxHeight] = useState<number | undefined>(
    undefined,
  );

  const closedLabel = useMemo(
    () => milestoneFilterClosedLabel(filterValue, milestones),
    [filterValue, milestones],
  );

  const listState = useMemo(
    () => buildMilestoneFilterList(milestones, filterQuery),
    [filterQuery, milestones],
  );

  const syncActiveToList = (query: string) => {
    const list = buildMilestoneFilterList(milestones, query);
    setActiveIndex(
      initialMilestoneFilterActiveIndex(filterValue, list, query),
    );
  };

  useEffect(() => {
    if (listOpen) return;
    setInputText(closedLabel);
    setFilterQuery("");
    setTyping(false);
  }, [closedLabel, listOpen]);

  useLayoutEffect(() => {
    if (!listOpen) return;
    const applyMaxHeight = () => {
      const combo = comboRef.current;
      if (!combo) return;
      const input = inputRef.current;
      const bottom = input
        ? input.getBoundingClientRect().bottom + 4 * readScale()
        : combo.getBoundingClientRect().bottom;
      setListMaxHeight(
        filterMilestoneDropdownMaxHeightPx(bottom, listState),
      );
    };
    applyMaxHeight();
    const onResize = () => applyMaxHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [listOpen, listState]);

  useLayoutEffect(() => {
    if (!listOpen || !listRef.current || activeIndex < 0) return;
    if (listState.options.length === 0) return;
    const list = listRef.current;
    const row = list.querySelector<HTMLElement>(
      `[data-filter-milestone-index="${activeIndex}"]`,
    );
    if (!row) return;
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top < listRect.top) {
      list.scrollTop -= listRect.top - rowRect.top;
    } else if (rowRect.bottom > listRect.bottom) {
      list.scrollTop += rowRect.bottom - listRect.bottom;
    }
  }, [activeIndex, listOpen, listState.options.length, listMaxHeight]);

  const selectAllInput = () => {
    const input = inputRef.current;
    if (!input) return;
    input.setSelectionRange(0, input.value.length);
  };

  const commitOption = (option: MilestoneFilterOption) => {
    const next = milestoneFilterValueFromOption(option);
    if (next !== filterValue) {
      onMilestoneChange(next);
    }
    setListOpen(false);
    setFilterQuery("");
    setTyping(false);
    setInputText(milestoneFilterClosedLabel(next, milestones));
  };

  const onFocus = () => {
    setListOpen(true);
    setFilterQuery("");
    setTyping(false);
    setInputText(closedLabel);
    syncActiveToList("");
    queueMicrotask(() => selectAllInput());
  };

  const onBlur = () => {
    setListOpen(false);
    setFilterQuery("");
    setTyping(false);
    setInputText(closedLabel);
  };

  const onInputChange = (text: string) => {
    setTyping(true);
    setFilterQuery(text);
    setInputText(text);
    setListOpen(true);
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
      if (!listOpen) {
        setListOpen(true);
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
      if (!listOpen) {
        setListOpen(true);
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
      if (!listOpen) return;
      event.preventDefault();
      event.stopPropagation();
      if (listState.noMatches || activeIndex < 0) return;
      const option = listState.options[activeIndex];
      if (option) commitOption(option);
      return;
    }
    if (event.key === "Escape" && listOpen) {
      event.preventDefault();
      event.stopPropagation();
      setListOpen(false);
      setFilterQuery("");
      setTyping(false);
      setInputText(closedLabel);
      queueMicrotask(() => selectAllInput());
    }
  };

  const activeOptionId =
    listOpen && activeIndex >= 0 && listState.options[activeIndex]
      ? `${listId}-opt-${activeIndex}`
      : undefined;

  const listboxId =
    listOpen && listState.options.length > 0 ? listId : undefined;

  return (
    <div className="filter-panel-field filter-panel-milestone">
      <label className="filter-panel-milestone-label" htmlFor={inputId}>
        マイルストン
      </label>
      <div className="filter-panel-milestone-combo" ref={comboRef}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="filter-panel-milestone-input"
          role="combobox"
          aria-expanded={listOpen}
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
            if (!typing && listOpen) e.preventDefault();
          }}
          onClick={() => {
            if (!typing) selectAllInput();
            if (!listOpen) setListOpen(true);
          }}
          onKeyDown={onInputKeyDown}
        />
        {listOpen ? (
          <div
            className="filter-panel-milestone-dropdown"
            style={
              listMaxHeight != null ? { maxHeight: listMaxHeight } : undefined
            }
          >
            {listState.options.length > 0 ? (
              <ul
                id={listId}
                ref={listRef}
                className="filter-panel-milestone-options"
                role="listbox"
              >
                {listState.options.map((option, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={filterMilestoneOptionKey(option)}>
                      <button
                        type="button"
                        role="option"
                        id={`${listId}-opt-${index}`}
                        data-filter-milestone-index={index}
                        aria-selected={active}
                        className={
                          active
                            ? "filter-panel-milestone-option filter-panel-milestone-option-active"
                            : "filter-panel-milestone-option"
                        }
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => commitOption(option)}
                      >
                        {filterMilestoneOptionLabel(option)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {listState.noMatches ? (
              <p
                className="filter-panel-milestone-status"
                role="status"
                aria-live="polite"
              >
                一致するマイルストンがありません
              </p>
            ) : null}
            {listState.truncated ? (
              <p
                className="filter-panel-milestone-status"
                role="status"
                aria-live="polite"
              >
                さらに絞り込んでください
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type FilterPanelProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  filters: ScheduleFilters;
  milestones: Milestone[];
  milestoneGroups: MilestoneGroup[];
  hiddenMilestoneGroupIds: ScheduleId[];
  onMilestoneGroupVisible: (groupId: ScheduleId, visible: boolean) => void;
  assigneeFilterOptions: AssigneeFilterOption[];
  statuses: readonly StatusItem[];
  scheduleTags: string[];
  onFiltersChange: (patch: Partial<ScheduleFilters>) => void;
};

export function FilterPanel({
  open,
  onClose,
  anchorRef,
  filters,
  milestones,
  milestoneGroups,
  hiddenMilestoneGroupIds,
  onMilestoneGroupVisible,
  assigneeFilterOptions,
  statuses,
  scheduleTags,
  onFiltersChange,
}: FilterPanelProps) {
  const hiddenMilestoneGroupSet = new Set(hiddenMilestoneGroupIds);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [shift, setShift] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    setPosition(anchorBelowRect(anchorRef.current));
    setShift({ x: 0, y: 0 });
  }, [anchorRef, open]);

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
  }, [open, position.left, position.top]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="filter-panel filter-panel--fixed"
      ref={panelRef}
      style={{
        left: position.left + shift.x,
        top: position.top + shift.y,
      }}
    >
      <div className="filter-panel-grid">
        <label className="filter-panel-field">
          <span>担当者</span>
          <select
            aria-label="担当者"
            value={filters.assignee}
            onChange={(e) => onFiltersChange({ assignee: e.target.value })}
          >
            <option value="all">すべて</option>
            <option value={UNASSIGNED_FILTER}>{UNASSIGNED_LABEL}</option>
            {assigneeFilterOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-panel-field">
          <span>ステータス</span>
          <select
            aria-label="ステータス"
            value={filters.status}
            onChange={(e) =>
              onFiltersChange({ status: e.target.value as StatusFilter })
            }
          >
            <option value="all">すべて</option>
            <option value="not-done">完了以外</option>
            <StatusOptions statuses={statuses} current={filters.status === "all" || filters.status === "not-done" ? undefined : filters.status} />
          </select>
        </label>
        <label className="filter-panel-field">
          <span>確度</span>
          <select
            aria-label="確度"
            value={filters.confidence}
            onChange={(e) =>
              onFiltersChange({ confidence: e.target.value as ConfidenceFilter })
            }
          >
            <option value="all">すべて</option>
            <option value="tentative">未確定</option>
            <option value="committed">確定</option>
          </select>
        </label>
        <label className="filter-panel-field">
          <span>期限</span>
          <select
            aria-label="期限"
            value={filters.overdue}
            onChange={(e) =>
              onFiltersChange({ overdue: e.target.value as OverdueFilter })
            }
          >
            <option value="all">すべて</option>
            <option value="overdue">期限超過</option>
          </select>
        </label>
        <label className="filter-panel-field">
          <span>前後</span>
          <select
            aria-label="前後"
            value={filters.relation}
            onChange={(e) =>
              onFiltersChange({ relation: e.target.value as RelationFilter })
            }
          >
            <option value="all">すべて</option>
            <option value="broken">破綻のみ</option>
          </select>
        </label>
        <FilterMilestoneField
          filterValue={filters.milestone}
          milestones={milestones}
          onMilestoneChange={(milestone) => onFiltersChange({ milestone })}
        />
        {scheduleTags.length === 0 ? (
          <div className="filter-panel-field filter-panel-tags filter-panel-field-span">
            <span>タグ</span>
            <p className="filter-panel-empty-tags" role="status">
              タグはありません
            </p>
          </div>
        ) : (
          <FilterTagField
            scheduleTags={scheduleTags}
            selectedTags={filters.tags}
            onTagsChange={(tags) => onFiltersChange({ tags })}
          />
        )}
        {milestoneGroups.length > 0 ? (
          <div className="filter-panel-field filter-panel-milestone-groups">
            <span>帯の線</span>
            <div className="filter-panel-checks">
              {milestoneGroups.map((group) => (
                <label key={group.id} className="filter-panel-check">
                  <input
                    type="checkbox"
                    checked={!hiddenMilestoneGroupSet.has(group.id)}
                    onChange={(e) =>
                      onMilestoneGroupVisible(group.id, e.target.checked)
                    }
                  />
                  <span>{group.name}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.getElementById("root") ?? document.body,
  );
}
