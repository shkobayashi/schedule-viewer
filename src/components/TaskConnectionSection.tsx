import { useEffect, useMemo, useRef, useState } from "react";
import type { TaskRef } from "../model/dependencies";
import { connectionsForTask, normalizeConnectionLabel } from "../model/connections";
import type { ScheduleId, TaskConnection } from "../model/types";
import { AddConnectionDialog } from "./AddConnectionDialog";
import { taskRelationLabel } from "./TaskEditDialog";

type TaskConnectionSectionProps = {
  taskId: ScheduleId;
  taskName: string;
  connections: readonly TaskConnection[] | undefined;
  tasks: TaskRef[];
  candidates: TaskRef[];
  onAdd: (otherTaskId: ScheduleId, label: string) => string | null;
  onUpdateLabel: (
    otherTaskId: ScheduleId,
    label: string,
  ) => string | null;
  onRemove: (otherTaskId: ScheduleId) => void;
  addDialogOpen: boolean;
  onAddDialogOpenChange: (open: boolean) => void;
};

function otherTaskIdInConnection(
  connection: TaskConnection,
  taskId: ScheduleId,
): ScheduleId {
  return connection.taskIds[0] === taskId
    ? connection.taskIds[1]
    : connection.taskIds[0];
}

export function TaskConnectionSection({
  taskId,
  taskName,
  connections,
  tasks,
  candidates,
  onAdd,
  onUpdateLabel,
  onRemove,
  addDialogOpen,
  onAddDialogOpenChange,
}: TaskConnectionSectionProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const formErrorRef = useRef<string | null>(null);

  useEffect(() => {
    formErrorRef.current = formError;
  }, [formError]);

  const announceFormError = (message: string) => {
    if (formErrorRef.current === message) {
      setFormError(null);
      queueMicrotask(() => setFormError(message));
      return;
    }
    setFormError(message);
  };

  const savedRows = useMemo(
    () => connectionsForTask(connections, taskId),
    [connections, taskId],
  );

  const linkedIds = useMemo(() => {
    const ids = new Set<ScheduleId>();
    for (const row of savedRows) {
      ids.add(otherTaskIdInConnection(row, taskId));
    }
    return ids;
  }, [savedRows, taskId]);

  const addCandidates = useMemo(
    () =>
      candidates.filter(
        (item) => item.id !== taskId && !linkedIds.has(item.id),
      ),
    [candidates, linkedIds, taskId],
  );

  return (
    <section className="detail-section">
      <h2 className="detail-section-title">繋がり</h2>
      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
      {savedRows.map((connection) => {
        const otherId = otherTaskIdInConnection(connection, taskId);
        const labelInfo = taskRelationLabel(tasks, otherId);
        return (
          <div className="field connection-row" key={otherId}>
            <span className="connection-row-name" title={labelInfo.title}>
              {labelInfo.ancestors ? (
                <span className="relation-ancestors">{labelInfo.ancestors}</span>
              ) : null}
              <span className="relation-leaf">{labelInfo.leaf}</span>
            </span>
            <label className="visually-hidden" htmlFor={`connection-label-${otherId}`}>
              繋がりの言葉
            </label>
            <input
              id={`connection-label-${otherId}`}
              type="text"
              className="connection-label-input"
              defaultValue={connection.label}
              key={`${otherId}:${connection.label}`}
              onBlur={(e) => {
                const next = e.target.value;
                const error = onUpdateLabel(otherId, next);
                if (error) {
                  announceFormError(error);
                  e.target.value = connection.label;
                  return;
                }
                const normalized = normalizeConnectionLabel(next);
                if (normalized === connection.label && next !== connection.label) {
                  e.target.value = connection.label;
                }
                setFormError(null);
              }}
            />
            <button type="button" onClick={() => onRemove(otherId)}>
              外す
            </button>
          </div>
        );
      })}
      <div className="field">
        <button type="button" onClick={() => onAddDialogOpenChange(true)}>
          足す
        </button>
      </div>
      {addDialogOpen ? (
        <AddConnectionDialog
          anchorTaskId={taskId}
          anchorTaskName={taskName}
          candidates={addCandidates}
          tasks={tasks}
          onConfirm={onAdd}
          onClose={() => onAddDialogOpenChange(false)}
        />
      ) : null}
    </section>
  );
}
