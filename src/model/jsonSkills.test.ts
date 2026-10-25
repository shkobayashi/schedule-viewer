import { describe, expect, it } from "vitest";

import {
  defaultJsonSkillToolSelection,
  hasJsonSkillToolSelection,
} from "./jsonSkills";

describe("defaultJsonSkillToolSelection", () => {
  it("selects all tools when no home dirs exist", () => {
    expect(
      defaultJsonSkillToolSelection({
        cursor: false,
        claude: false,
        copilot: false,
      }),
    ).toEqual({ cursor: true, claude: true, copilot: true });
  });

  it("selects only copilot when only copilot home exists", () => {
    expect(
      defaultJsonSkillToolSelection({
        cursor: false,
        claude: false,
        copilot: true,
      }),
    ).toEqual({ cursor: false, claude: false, copilot: true });
  });

  it("selects cursor and claude when both exist", () => {
    expect(
      defaultJsonSkillToolSelection({
        cursor: true,
        claude: true,
        copilot: false,
      }),
    ).toEqual({ cursor: true, claude: true, copilot: false });
  });
});

describe("hasJsonSkillToolSelection", () => {
  it("is false when nothing is selected", () => {
    expect(
      hasJsonSkillToolSelection({ cursor: false, claude: false, copilot: false }),
    ).toBe(false);
  });

  it("is true when any tool is selected", () => {
    expect(
      hasJsonSkillToolSelection({ cursor: false, claude: false, copilot: true }),
    ).toBe(true);
  });
});
