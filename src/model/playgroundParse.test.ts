import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseScheduleText } from "./scheduleFile";

describe("playground.schedule.json", () => {
  it("keeps outline and levels in parse result and canonical json", () => {
    const text = readFileSync(
      join(import.meta.dirname, "../../examples/playground.schedule.json"),
      "utf8",
    );
    const parsed = parseScheduleText(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.outline?.length).toBeGreaterThan(0);
    expect(parsed.document.levels?.length).toBe(3);
    expect(parsed.canonicalJson).toContain('"outline"');
    expect(parsed.canonicalJson).toContain('"levels"');
  });
});
