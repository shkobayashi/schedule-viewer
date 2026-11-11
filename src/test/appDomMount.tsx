import { dirname, join } from "node:path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect } from "vitest";
import App from "../App";
import { parseScheduleText } from "../model/scheduleFile";
import type { ScheduleDocument } from "../model/types";
import { EXTERNAL_RELOAD_POLL_MS } from "../hooks/scheduleFile/constants";
import { createAppDomInvoke, type AppDomInvoke } from "./appDomInvoke";
import { pollJson } from "./scheduleFileFlowTestEnv";
import type { ScheduleFileTauriInvoke } from "./scheduleFileFlowInvoke";

export function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

export async function dismissFirstRunIfPresent() {
  const close = screen.queryByRole("button", { name: "閉じる" });
  if (
    close &&
    (screen.queryByText("次の 3 つを終えましょう") ||
      screen.queryByText("サンプルを表示しています"))
  ) {
    fireEvent.click(close);
  }
}

export async function waitForAppReady() {
  await screen.findByTitle("メニュー", {}, { timeout: 8000 });
}

async function settleAfterPoll() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

export async function driveExternalPoll(flow: AppDomInvoke, document: ScheduleDocument) {
  flow.queuePoll(pollJson(document));
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, EXTERNAL_RELOAD_POLL_MS + 50);
    });
  });
  await settleAfterPoll();
}

export async function flushMicrotasks(times = 40) {
  await act(async () => {
    for (let i = 0; i < times; i += 1) {
      await Promise.resolve();
    }
  });
}

export async function expandSidebarUntilTask(taskName: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const taskRow = screen.queryByText(taskName)?.closest(".sidebar-row.task");
    if (taskRow) return;
    const expanders = screen
      .queryAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-label")?.endsWith("を展開"));
    if (expanders.length === 0) break;
    fireEvent.click(expanders[0]!);
    await flushMicrotasks(5);
  }
  await waitFor(() => expect(screen.getByText(taskName)).toBeInTheDocument());
}

export function pressKey(target: EventTarget, init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

export async function mountApp(
  startup: {
    path: string;
    workspacePath?: string | null;
    contents: string;
  },
  invoke: ReturnType<typeof import("vitest").vi.fn<ScheduleFileTauriInvoke>>,
  options: { onWorkspaceReload?: (workspacePath: string) => void } = {},
) {
  const parsed = parseScheduleText(startup.contents);
  if (!parsed.ok) throw new Error(parsed.message);
  const flow = createAppDomInvoke(parsed.document);
  if (options.onWorkspaceReload) {
    flow.setOnWorkspaceReload(options.onWorkspaceReload);
  }
  const startupRead = {
    path: startup.path,
    workspacePath: startup.workspacePath ?? null,
    sample: false as const,
    contents: startup.contents,
    error: null,
    draftText: null,
    transientMain: false,
  };
  flow.setStartupRead(startupRead);
  flow.setDisk(startup.path, startup.contents);
  invoke.mockImplementation((command, args) => flow.invoke(command, args));
  flow.holdStartup();
  render(<App />);
  await act(async () => {
    flow.resolveStartup(startupRead);
    await flow.invoke("accept_opened_schedule", {
      path: startup.path,
      contents: startup.contents,
    });
  });
  await waitForAppReady();
  await dismissFirstRunIfPresent();
  return { flow, document: parsed.document };
}

export async function mountWorkspaceApp(
  options: {
    document: ScheduleDocument;
    workspacePath: string;
    schedulePath: string;
    scheduleContents: string;
    waitForTaskLabel: string;
    prepareFlow?: (flow: AppDomInvoke) => void;
  },
  invoke: ReturnType<typeof import("vitest").vi.fn<ScheduleFileTauriInvoke>>,
) {
  const flow = createAppDomInvoke(options.document);
  const startupRead = {
    path: options.schedulePath,
    workspacePath: options.workspacePath,
    sample: false as const,
    contents: options.scheduleContents,
    error: null,
    draftText: null,
    transientMain: false,
  };
  options.prepareFlow?.(flow);
  flow.setStartupRead(startupRead);
  flow.setDisk(options.schedulePath, options.scheduleContents);
  invoke.mockImplementation((command, args) => flow.invoke(command, args));
  flow.holdStartup();
  render(<App />);
  await act(async () => {
    flow.resolveStartup(startupRead);
    await flow.invoke("accept_opened_schedule", {
      path: options.schedulePath,
      contents: options.scheduleContents,
    });
  });
  await waitForAppReady();
  await waitFor(() =>
    expect(screen.getByText(options.waitForTaskLabel)).toBeInTheDocument(),
  );
  await dismissFirstRunIfPresent();
  return flow;
}

export function openMenu() {
  fireEvent.click(screen.getByTitle("メニュー"));
}

export async function openSettingsSection(section: string) {
  openMenu();
  const menus = await screen.findAllByRole("menu");
  const menu = menus[menus.length - 1]!;
  const settingsItems = within(menu)
    .getAllByRole("menuitem")
    .filter((item) => item.textContent?.includes("設定"));
  const settingsItem = settingsItems[0];
  if (!settingsItem) throw new Error("設定メニューが見つかりません");
  fireEvent.click(settingsItem);
  await flushMicrotasks(20);
  const settings = await screen.findByRole("dialog", { name: "設定" }, { timeout: 8000 });
  fireEvent.click(within(settings).getByRole("button", { name: section }));
  return settings;
}

export async function saveViaShortcut() {
  pressKey(window, { key: "s", ctrlKey: true });
}

export async function openCommandPalette() {
  pressKey(window, { key: "k", ctrlKey: true });
  return screen.findByRole("dialog", { name: "コマンド" });
}

export function seedFieldsWorkspaceOnFlow(
  flow: AppDomInvoke,
  wsPath: string,
  schedulePath: string,
  readExampleText: (relative: string) => string,
  canonicalText: (text: string) => string,
  options: { editableRelative?: string; editableBody?: string } = {},
) {
  const ws: Record<string, unknown> = {
    schemaVersion: 1,
    schedule: "schedule.json",
    fieldExtensions: ["sample.fields.json"],
  };
  if (options.editableRelative) {
    ws.editableFieldExtension = options.editableRelative;
  }
  flow.setDisk(wsPath, `${JSON.stringify(ws, null, 2)}\n`);
  flow.setDisk(schedulePath, canonicalText(readExampleText("fields.schedule.json")));
  flow.setDisk(
    join(dirname(wsPath), "sample.fields.json"),
    readExampleText("fields/sample.fields.json"),
  );
  if (options.editableRelative && options.editableBody) {
    flow.setDisk(join(dirname(wsPath), options.editableRelative), options.editableBody);
  }
}
