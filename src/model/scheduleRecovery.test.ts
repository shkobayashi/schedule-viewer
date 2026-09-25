import { describe, expect, it } from "vitest";
import {
  decideRecoveryStartup,
  parseRecoveryDraft,
} from "./scheduleRecovery";
import { SCHEDULE_FILE_NOT_FOUND, serializeScheduleDocument } from "./scheduleFile";
import { sampleCategories, sampleMilestones, SAMPLE_PROJECT_TITLE } from "../sample/schedule";

const baselineJson = serializeScheduleDocument(
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  sampleMilestones,
);

function draftJson(documentJson: string): string {
  return JSON.stringify({
    path: "/tmp/plan.json",
    baselineJson,
    documentJson,
  });
}

function withTitle(title: string): string {
  const data = JSON.parse(baselineJson) as { title: string };
  data.title = title;
  return JSON.stringify(data, null, 2);
}

describe("parseRecoveryDraft", () => {
  it("accepts a valid draft", () => {
    const doc = withTitle("編集中");
    const result = parseRecoveryDraft(draftJson(doc));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.path).toBe("/tmp/plan.json");
      expect(result.draft.documentJson).toBe(doc);
    }
  });

  it("rejects invalid document JSON", () => {
    const result = parseRecoveryDraft(
      draftJson("{"),
    );
    expect(result.ok).toBe(false);
  });
});

describe("decideRecoveryStartup", () => {
  it("returns none when no draft", () => {
    expect(decideRecoveryStartup(null, baselineJson, null).kind).toBe("none");
  });

  it("restores when disk matches baseline", () => {
    const doc = withTitle("編集中");
    const action = decideRecoveryStartup(
      draftJson(doc),
      baselineJson,
      null,
    );
    expect(action.kind).toBe("restore");
    if (action.kind === "restore") {
      expect(action.document.title).toBe("編集中");
      expect(action.baselineJson).toBe(baselineJson);
    }
  });

  it("returns conflict when disk differs from baseline", () => {
    const doc = withTitle("編集中");
    const disk = withTitle("LLM更新");
    const action = decideRecoveryStartup(
      draftJson(doc),
      disk,
      null,
    );
    expect(action.kind).toBe("conflict");
  });

  it("returns invalidDraft for broken draft wrapper", () => {
    const action = decideRecoveryStartup("{", baselineJson, null);
    expect(action.kind).toBe("invalidDraft");
  });

  it("returns diskMissing when file not found", () => {
    const doc = withTitle("編集中");
    const action = decideRecoveryStartup(
      draftJson(doc),
      null,
      SCHEDULE_FILE_NOT_FOUND,
    );
    expect(action.kind).toBe("diskMissing");
  });

  it("restores when disk formatting differs but canonical matches", () => {
    const doc = withTitle("編集中");
    const minified = JSON.stringify(JSON.parse(baselineJson));
    const action = decideRecoveryStartup(draftJson(doc), minified, null);
    expect(action.kind).toBe("restore");
    if (action.kind === "restore") {
      expect(action.baselineJson).toBe(baselineJson);
    }
  });

  it("returns invalidDisk when the file fails validation", () => {
    const doc = withTitle("編集中");
    const action = decideRecoveryStartup(
      draftJson(doc),
      "{",
      null,
    );
    expect(action.kind).toBe("invalidDisk");
  });
});
