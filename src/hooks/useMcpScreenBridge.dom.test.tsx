import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useMcpScreenBridge,
  type UseMcpScreenBridgeInput,
} from "./useMcpScreenBridge";

const invoke = vi.hoisted(() => vi.fn(async () => undefined));

type Deferred = {
  event: string;
  resolve: (off: () => void) => void;
};

const pendingListens = vi.hoisted(() => [] as Deferred[]);

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ label: "main" }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(
    (event: string) =>
      new Promise<() => void>((resolve) => {
        pendingListens.push({ event, resolve });
      }),
  ),
}));

function resolveListen(event: string, off: () => void) {
  const index = pendingListens.findIndex((item) => item.event === event);
  expect(index).toBeGreaterThanOrEqual(0);
  const [item] = pendingListens.splice(index, 1);
  item.resolve(off);
}

function readyCalls() {
  return invoke.mock.calls.filter(
    (call) => (call as unknown[])[0] === "mcp_screen_listener_ready",
  );
}

const input = {} as UseMcpScreenBridgeInput;

describe("useMcpScreenBridge の受け口の登録", () => {
  afterEach(() => {
    pendingListens.length = 0;
    invoke.mockClear();
  });

  it("listen の解決前に unmount すると、解決したときに受け口を外し、準備完了を知らせない", async () => {
    const { unmount } = renderHook(() => useMcpScreenBridge(input));
    unmount();
    const offRequest = vi.fn();
    const offInvalidated = vi.fn();
    resolveListen("mcp-screen-request", offRequest);
    resolveListen("mcp-in-progress-invalidated", offInvalidated);
    await waitFor(() => {
      expect(offRequest).toHaveBeenCalledTimes(1);
      expect(offInvalidated).toHaveBeenCalledTimes(1);
    });
    expect(readyCalls()).toHaveLength(0);
  });

  it("マウント中に listen が解決すると、準備完了を 1 回だけ知らせ、unmount で受け口を外す", async () => {
    const { unmount } = renderHook(() => useMcpScreenBridge(input));
    const offRequest = vi.fn();
    const offInvalidated = vi.fn();
    resolveListen("mcp-in-progress-invalidated", offInvalidated);
    resolveListen("mcp-screen-request", offRequest);
    await waitFor(() => expect(readyCalls()).toHaveLength(1));
    expect(offRequest).not.toHaveBeenCalled();
    unmount();
    expect(offRequest).toHaveBeenCalledTimes(1);
    expect(offInvalidated).toHaveBeenCalledTimes(1);
    expect(readyCalls()).toHaveLength(1);
  });
});
