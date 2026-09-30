import { describe, expect, it } from "vitest";
import { claimSave, withSaveFlight } from "./saveFlight";

describe("save flight", () => {
  it("rejects a second save until the first releases the flight", async () => {
    const flight = { current: false };
    let started = 0;
    let release: () => void = () => {};
    const first = withSaveFlight(flight, false, () => {
      started += 1;
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    const second = await withSaveFlight(flight, false, async () => {
      started += 1;
    });
    expect(second).toBe(false);
    expect(started).toBe(1);
    release();
    await first;
    expect(flight.current).toBe(false);
    expect(await withSaveFlight(flight, false, async () => {})).toBe(true);
  });

  it("does not start a save while the file operation is busy", () => {
    const flight = { current: false };
    expect(claimSave(flight, true)).toBe(false);
    expect(flight.current).toBe(false);
  });
});
