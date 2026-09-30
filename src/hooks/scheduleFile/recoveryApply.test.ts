import { describe, expect, it } from "vitest";
import { applyAfterAccept } from "./recoveryApply";

describe("applyAfterAccept", () => {
  it("accepts before checking the generation again and skips the screen update", async () => {
    let generation = 1;
    const calls: string[] = [];
    const applied = await applyAfterAccept({
      abortIfMovedOn: true,
      movedOn: () => generation !== 1,
      accept: async () => {
        calls.push("accept");
        generation = 2;
      },
      apply: () => {
        calls.push("apply");
        return true;
      },
    });
    expect(applied).toBe(false);
    expect(calls).toEqual(["accept"]);
  });

  it("does not accept once the generation has already moved on", async () => {
    const calls: string[] = [];
    const applied = await applyAfterAccept({
      abortIfMovedOn: true,
      movedOn: () => true,
      accept: async () => {
        calls.push("accept");
      },
      apply: () => {
        calls.push("apply");
        return true;
      },
    });
    expect(applied).toBe(false);
    expect(calls).toEqual([]);
  });
});
