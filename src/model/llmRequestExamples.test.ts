import { describe, expect, it } from "vitest";
import {
  FIRST_RUN_TRY_LLM_PROMPT,
  FIRST_RUN_TRY_LLM_UNDO_HINT,
  LLM_REQUEST_EXAMPLES,
  llmRequestExamplePrompts,
} from "./llmRequestExamples";

describe("llmRequestExamples", () => {
  it("lists 3–5 verified example prompts", () => {
    const prompts = llmRequestExamplePrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(3);
    expect(prompts.length).toBeLessThanOrEqual(5);
    expect(prompts).toContain(FIRST_RUN_TRY_LLM_PROMPT);
    expect(prompts).toContain("やっぱり戻して");
    expect(prompts).toContain(
      "設計が 1 週間遅れたら、リリースはどうなる？画面で見せて",
    );
  });

  it("includes undo hint for the first-run card", () => {
    expect(FIRST_RUN_TRY_LLM_UNDO_HINT).toContain("やっぱり戻して");
    expect(FIRST_RUN_TRY_LLM_UNDO_HINT).toContain("取り消し");
  });

  it("gives each example a non-empty hint", () => {
    for (const row of LLM_REQUEST_EXAMPLES) {
      expect(row.prompt.trim().length).toBeGreaterThan(0);
      expect(row.hint.trim().length).toBeGreaterThan(0);
    }
  });
});
