import { describe, expect, it } from "vitest";
import {
  APPLY_EXPLANATION_PATTERN_NO_OVERLAY,
  APPLY_EXPLANATION_PATTERN_UNKNOWN,
  EXPLAIN_OVERLAY_PATTERNS_REJECT,
} from "../model/explainOverlayPatterns";
import { openHeadlessSchedule, type HeadlessSchedule, type HeadlessStep } from "./headlessScheduleSession";
import { readRegressionText } from "./searchErrorKeysFixtures";

const TASK_A = "e1000001-0000-4000-8000-000000000001";

function openSmoke(): HeadlessSchedule {
  return openHeadlessSchedule(readRegressionText("smoke.schedule.json"));
}

async function run(session: HeadlessSchedule, steps: readonly HeadlessStep[]): Promise<void> {
  for (const step of steps) {
    const result = await session.run(step);
    expect(result.ok, result.message).toBe(true);
  }
}

describe("headlessScheduleSession explain regression", () => {
  it("explain_overlay hide clears overlay state", async () => {
    const session = openSmoke();
    const shown = await session.run({
      tool: "explain_overlay",
      envelope: { translucent: true, summary: "試し半透明" },
    });
    expect(shown.explainOverlay?.translucent).toBe(true);
    const hidden = await session.run({
      tool: "explain_overlay",
      envelope: { translucent: false },
    });
    expect(hidden.ok).toBe(true);
    expect(hidden.explainOverlay).toBeNull();
  });

  it("explain_view apply and clear", async () => {
    const session = openSmoke();
    const applied = await session.run({
      tool: "explain_view",
      envelope: { taskIds: [TASK_A] },
    });
    expect(applied.ok).toBe(true);
    expect(applied.explainView?.taskIds).toEqual(new Set([TASK_A]));
    const cleared = await session.run({
      tool: "explain_view",
      envelope: { clear: true },
    });
    expect(cleared.ok).toBe(true);
    expect(cleared.explainView).toBeNull();
  });

  it("pattern rejects with exact messages", async () => {
    const session = openSmoke();
    const badPattern = await session.run({
      tool: "explain_overlay",
      envelope: {
        translucent: true,
        patterns: [{ id: "p", name: "P", color: "#3366cc", extra: true, tasks: [], changes: [] }],
      },
    });
    expect(badPattern.ok).toBe(false);
    expect(badPattern.message).toBe(EXPLAIN_OVERLAY_PATTERNS_REJECT);

    await session.run({ tool: "reload" });
    const missingId = await session.run({
      tool: "apply_explanation_pattern",
      patternId: "",
    });
    expect(missingId.ok).toBe(false);
    expect(missingId.message).toBe("patternId が要ります。");

    const noOverlay = await session.run({
      tool: "apply_explanation_pattern",
      patternId: "missing",
    });
    expect(noOverlay.ok).toBe(false);
    expect(noOverlay.message).toBe(APPLY_EXPLANATION_PATTERN_NO_OVERLAY);

    await run(session, [
      {
        tool: "explain_overlay",
        envelope: {
          translucent: true,
          patterns: [
            {
              id: "listed-only",
              name: "一覧のみ",
              color: "#3366cc",
              tasks: [],
              changes: [],
            },
          ],
        },
      },
    ]);
    const unknown = await session.run({
      tool: "apply_explanation_pattern",
      patternId: "nope",
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.message).toBe(APPLY_EXPLANATION_PATTERN_UNKNOWN);
  });
});
