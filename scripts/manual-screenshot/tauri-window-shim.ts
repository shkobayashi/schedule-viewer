type WindowStub = {
  label: string;
  setTitle: () => Promise<void>;
  onCloseRequested: () => Promise<() => void>;
};

const mainWindow: WindowStub = {
  label: "main",
  setTitle: async () => undefined,
  onCloseRequested: async () => () => undefined,
};

export function getCurrentWindow(): WindowStub {
  return mainWindow;
}
