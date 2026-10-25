export type WorkspaceDocument = {
  schemaVersion: 1;
  schedule: string;
  members?: string;
  calendar?: string;
};

export type WorkspaceResolvedPaths = {
  schedulePath: string;
  membersPath: string | null;
  calendarPath: string | null;
};

export type WorkspaceMemberState =
  | { kind: "unset" }
  | { kind: "loaded"; label: string; members: import("./memberTypes").Member[] }
  | { kind: "error"; message: string };

export type WorkspaceCalendarState =
  | { kind: "unset" }
  | {
      kind: "loaded";
      label: string;
      document: import("./calendarTypes").CalendarDocument;
    }
  | { kind: "error"; message: string };

export type WorkspaceWindowBinding = {
  workspacePath: string;
  document: WorkspaceDocument;
  resolved: WorkspaceResolvedPaths;
  members: WorkspaceMemberState;
  calendar: WorkspaceCalendarState;
};
