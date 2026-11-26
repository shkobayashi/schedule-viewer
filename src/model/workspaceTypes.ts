export type WorkspaceDocument = {
  schemaVersion: 1;
  schedule: string;
  members?: string;
  calendar?: string;
  statuses?: string;
  colors?: string;
  fieldExtensions?: string[];
  editableFieldExtension?: string;
};

export type WorkspaceResolvedPaths = {
  schedulePath: string;
  membersPath: string | null;
  calendarPath: string | null;
  statusesPath: string | null;
  colorsPath: string | null;
  fieldExtensionPaths: string[];
  editableFieldExtensionPath: string | null;
};

export type WorkspaceEditableFieldExtensionState =
  | { kind: "unset" }
  | {
      kind: "loaded";
      document: import("./fieldExtensionTypes").FieldExtensionDocument;
      path: string;
      relativePath: string;
    }
  | { kind: "error"; message: string };

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

export type WorkspaceStatusesState =
  | { kind: "unset" }
  | {
      kind: "loaded";
      label: string;
      items: import("./statusCatalog").StatusItem[];
    }
  | { kind: "error"; message: string };

export type WorkspaceFieldExtensionsState =
  | { kind: "unset" }
  | {
      kind: "loaded";
      documents: import("./fieldExtensionTypes").FieldExtensionDocument[];
      paths: string[];
    }
  | { kind: "error"; message: string };

export type WorkspaceColorsState =
  | { kind: "unset" }
  | {
      kind: "loaded";
      label: string;
      items: import("./colorCatalog").ColorItem[];
    }
  | { kind: "error"; message: string };

export type WorkspaceWindowBinding = {
  workspacePath: string;
  document: WorkspaceDocument;
  resolved: WorkspaceResolvedPaths;
  members: WorkspaceMemberState;
  calendar: WorkspaceCalendarState;
  statuses: WorkspaceStatusesState;
  colors: WorkspaceColorsState;
  fieldExtensions: WorkspaceFieldExtensionsState;
  editableFieldExtension: WorkspaceEditableFieldExtensionState;
};
