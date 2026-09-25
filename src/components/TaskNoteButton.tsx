import { hasTaskNote } from "../model/taskNote";
import type { Task } from "../model/types";

type TaskNoteButtonProps = {
  task: Task;
  onOpen: () => void;
};

export function TaskNoteButton({ task, onOpen }: TaskNoteButtonProps) {
  const filled = hasTaskNote(task);
  const title = filled
    ? "ノートを表示・編集"
    : "ノートを追加";

  return (
    <button
      type="button"
      className={`task-note-btn${filled ? " has-note" : " empty"}`}
      aria-label={title}
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <svg
        className="task-note-icon"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M3 1.5h7l3.5 3.5V13.5A1.5 1.5 0 0 1 12 15H3A1.5 1.5 0 0 1 1.5 13.5v-11A1.5 1.5 0 0 1 3 1.5zm6.5 0V5H13L9.5 1.5zM4 7.25h8v1H4v-1zm0 2.5h8v1H4v-1zm0 2.5h5v1H4v-1z"
        />
      </svg>
    </button>
  );
}
