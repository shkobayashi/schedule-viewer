import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
  invoke: vi.fn(),
}));

import { invoke, isTauri } from "@tauri-apps/api/core";
import { readStoreDistribution } from "./storeDistribution";

describe("readStoreDistribution", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    vi.mocked(isTauri).mockReturnValue(true);
  });

  it("returns false when not in Tauri", async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await expect(readStoreDistribution()).resolves.toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("caches invoke result", async () => {
    vi.mocked(invoke).mockResolvedValue(true);
    await expect(readStoreDistribution()).resolves.toBe(true);
    await expect(readStoreDistribution()).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("is_store_distribution");
  });
});
