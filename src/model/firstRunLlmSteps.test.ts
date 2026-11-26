import { describe, expect, it } from "vitest";
import {
  FIRST_RUN_WRITE_SCHEDULE_EXAMPLE_PROMPT,
  WRITE_SCHEDULE_SKILL_NAME,
  markPrepareLlmStepsVisible,
  readPrepareLlmStepsVisible,
} from "./firstRunLlmSteps";

describe("firstRunLlmSteps", () => {
  it("uses the write-schedule skill name in the example prompt", () => {
    expect(WRITE_SCHEDULE_SKILL_NAME).toBe("write-schedule");
    expect(FIRST_RUN_WRITE_SCHEDULE_EXAMPLE_PROMPT).toContain(
      "write-schedule スキルに従い",
    );
  });

  it("persists prepare-llm-steps visibility flag", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
    expect(readPrepareLlmStepsVisible(storage)).toBe(false);
    markPrepareLlmStepsVisible(storage);
    expect(readPrepareLlmStepsVisible(storage)).toBe(true);
  });
});
