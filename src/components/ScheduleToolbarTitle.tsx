import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Pencil } from "lucide-react";
import type { ScheduleTitleCommitResult } from "../model/scheduleTitleEdit";

export type ScheduleToolbarTitleHandle = {
  startEdit: () => void;
  commitIfEditing: () => ScheduleTitleCommitResult | null;
  isEditing: () => boolean;
};

type ScheduleToolbarTitleProps = {
  title: string;
  titleDiffMarked: boolean;
  titleEditDisabled: boolean;
  onCommitTitle: (raw: string) => ScheduleTitleCommitResult;
  onEditingChange: (editing: boolean) => void;
  onBlankCommit: () => void;
  titleEditHandleRef?: RefObject<ScheduleToolbarTitleHandle | null>;
  editRequestToken: number;
};

function TitleHeadingText({
  title,
  titleDiffMarked,
}: {
  title: string;
  titleDiffMarked: boolean;
}) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const label = textRef.current;
    if (!clip || !label) return;

    const measure = () => {
      setOverflow(label.scrollWidth - clip.clientWidth > 0);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(clip);
    return () => observer.disconnect();
  }, [title]);

  return (
    <span
      ref={clipRef}
      className={`toolbar-title-text${titleDiffMarked ? " diff-title-marked" : ""}`}
      title={overflow ? title : undefined}
    >
      <span ref={textRef} className="row-label-text">{title}</span>
    </span>
  );
}

export function ScheduleToolbarTitle({
  title,
  titleDiffMarked,
  titleEditDisabled,
  onCommitTitle,
  onEditingChange,
  onBlankCommit,
  titleEditHandleRef,
  editRequestToken,
}: ScheduleToolbarTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [sessionTitle, setSessionTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const committingRef = useRef(false);
  const closingWithoutCommitRef = useRef(false);
  const focusPencilAfterCloseRef = useRef(false);
  const titleRef = useRef(title);
  titleRef.current = title;
  const titleEditDisabledRef = useRef(titleEditDisabled);
  titleEditDisabledRef.current = titleEditDisabled;
  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;

  const beginEdit = useCallback(() => {
    if (titleEditDisabledRef.current) return;
    const currentTitle = titleRef.current;
    setSessionTitle(currentTitle);
    setDraft(currentTitle);
    setEditing(true);
    onEditingChangeRef.current(true);
  }, []);

  const endEdit = useCallback(
    (nextEditing: boolean) => {
      setEditing(nextEditing);
      onEditingChange(nextEditing);
    },
    [onEditingChange],
  );

  const cancelEdit = useCallback(() => {
    closingWithoutCommitRef.current = true;
    setDraft(sessionTitle);
    endEdit(false);
    queueMicrotask(() => {
      closingWithoutCommitRef.current = false;
    });
  }, [endEdit, sessionTitle]);

  const commitEdit = useCallback(
    (focusPencil: boolean): ScheduleTitleCommitResult => {
      committingRef.current = true;
      const result = onCommitTitle(draft);
      if (result.kind === "blank") {
        setDraft(sessionTitle);
        onBlankCommit();
      }
      endEdit(false);
      if (focusPencil) {
        focusPencilAfterCloseRef.current = true;
      }
      queueMicrotask(() => {
        committingRef.current = false;
      });
      return result;
    },
    [draft, endEdit, onBlankCommit, onCommitTitle, sessionTitle],
  );

  useImperativeHandle(
    titleEditHandleRef,
    () => ({
      startEdit: beginEdit,
      commitIfEditing: () => {
        if (!editingRef.current) return null;
        return commitEdit(false);
      },
      isEditing: () => editingRef.current,
    }),
    [beginEdit, commitEdit],
  );

  useEffect(() => {
    if (editRequestToken === 0) return;
    beginEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- パレットの要求番号だけで開く
  }, [editRequestToken]);

  useEffect(() => {
    if (editing) return;
    if (!focusPencilAfterCloseRef.current) return;
    focusPencilAfterCloseRef.current = false;
    const frame = requestAnimationFrame(() => pencilRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.select();
      input.scrollLeft = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [editing]);

  useEffect(() => {
    if (editing) return;
    setDraft(title);
    setSessionTitle(title);
  }, [editing, title]);

  if (editing) {
    return (
      <div className="toolbar-title toolbar-title-editing">
        <h1 className="toolbar-title-heading toolbar-title-heading-sr-only">
          {sessionTitle}
        </h1>
        <input
          ref={inputRef}
          type="text"
          className="toolbar-title-input"
          aria-label="スケジュールのタイトル"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === "Enter") {
              event.preventDefault();
              commitEdit(true);
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelEdit();
              focusPencilAfterCloseRef.current = true;
            }
          }}
          onBlur={() => {
            if (committingRef.current || closingWithoutCommitRef.current) return;
            commitEdit(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="toolbar-title">
      <h1 className="toolbar-title-heading">
        <TitleHeadingText title={title} titleDiffMarked={titleDiffMarked} />
      </h1>
      <button
        ref={pencilRef}
        type="button"
        className="toolbar-title-edit-btn"
        aria-label="タイトルを変更"
        title="タイトルを変更"
        disabled={titleEditDisabled}
        onClick={beginEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            beginEdit();
          }
        }}
      >
        <Pencil
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          style={{
            width: "calc(14px * var(--s))",
            height: "calc(14px * var(--s))",
          }}
        />
      </button>
    </div>
  );
}
