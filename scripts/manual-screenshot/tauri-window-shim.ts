type CloseRequestedEvent = { preventDefault: () => void };

type WindowStub = {
  label: string;
  setTitle: () => Promise<void>;
  close: () => Promise<void>;
  onCloseRequested: (
    handler: (event: CloseRequestedEvent) => void | Promise<void>,
  ) => Promise<() => void>;
  onFocusChanged: (
    handler: (event: { payload: boolean }) => void,
  ) => Promise<() => void>;
  onDragDropEvent: (
    handler: (event: {
      payload: { type: string; paths?: string[] };
    }) => void,
  ) => Promise<() => void>;
};

const mainWindow: WindowStub = {
  label: "main",
  setTitle: async () => undefined,
  close: async () => undefined,
  onCloseRequested: async () => () => undefined,
  onFocusChanged: async () => () => undefined,
  onDragDropEvent: async () => () => undefined,
};

export function getCurrentWindow(): WindowStub {
  return mainWindow;
}
