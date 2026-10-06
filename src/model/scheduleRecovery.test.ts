import { describe, expect, it } from "vitest";
import {
  decideRecoveryStartup,
  parseRecoveryDraft,
} from "./scheduleRecovery";
import {
  SCHEDULE_FILE_NOT_FOUND,
  scheduleParentDirectory,
  serializeScheduleDocument,
} from "./scheduleFile";
import {
  sampleCategories,
  sampleMilestoneGroups,
  sampleMilestones,
  SAMPLE_PROJECT_TITLE,
} from "../sample/schedule";

const baselineJson = serializeScheduleDocument(
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  sampleMilestoneGroups,
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

describe("scheduleParentDirectory", () => {
  it("returns the parent and skips a bare filename", () => {
    expect(scheduleParentDirectory("/tmp/plan.json")).toBe("/tmp");
    expect(scheduleParentDirectory("C:\\plans\\plan.json")).toBe("C:\\plans");
    expect(scheduleParentDirectory("plan.json")).toBeNull();
    expect(scheduleParentDirectory("/plan.json")).toBeNull();
  });
});

describe("decideRecoveryStartup", () => {
  const path = "/tmp/plan.json";

  it("returns none when nothing was open", () => {
    expect(decideRecoveryStartup(null, null, null, null).kind).toBe("none");
  });

  it("opens the saved file when there is no draft", () => {
    const action = decideRecoveryStartup(path, null, baselineJson, null);
    expect(action.kind).toBe("openSaved");
    if (action.kind === "openSaved") {
      expect(action.path).toBe(path);
      expect(action.baselineJson).toBe(baselineJson);
      expect(action.ignoredDraft).toBe(false);
    }
  });

  it("opens a saved file when only formatting differs", () => {
    const minified = JSON.stringify(JSON.parse(baselineJson));
    const action = decideRecoveryStartup(path, null, minified, null);
    expect(action.kind).toBe("openSaved");
    if (action.kind === "openSaved") {
      expect(action.baselineJson).toBe(baselineJson);
    }
  });

  it("restores when disk matches baseline", () => {
    const doc = withTitle("編集中");
    const action = decideRecoveryStartup(
      path,
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
      path,
      draftJson(doc),
      disk,
      null,
    );
    expect(action.kind).toBe("conflict");
  });

  it("returns invalidDraft for broken draft wrapper", () => {
    const action = decideRecoveryStartup(path, "{", baselineJson, null);
    expect(action.kind).toBe("invalidDraft");
  });

  it("returns missingWithEdits when the file is gone and a draft exists", () => {
    const doc = withTitle("編集中");
    const action = decideRecoveryStartup(
      path,
      draftJson(doc),
      null,
      SCHEDULE_FILE_NOT_FOUND,
    );
    expect(action.kind).toBe("missingWithEdits");
    if (action.kind === "missingWithEdits") {
      expect(action.document.title).toBe("編集中");
      expect(action.path).toBe(path);
    }
  });

  it("returns missingNotice when the saved file is gone", () => {
    const action = decideRecoveryStartup(
      path,
      null,
      null,
      SCHEDULE_FILE_NOT_FOUND,
    );
    expect(action.kind).toBe("missingNotice");
    if (action.kind === "missingNotice") {
      expect(action.ignoredDraft).toBe(false);
    }
  });

  it("uses the draft path when no last path was stored", () => {
    const doc = withTitle("編集中");
    const action = decideRecoveryStartup(null, draftJson(doc), baselineJson, null);
    expect(action.kind).toBe("restore");
    if (action.kind === "restore") {
      expect(action.path).toBe(path);
    }
  });

  it("ignores a draft for a different path and opens the remembered file", () => {
    const other = JSON.stringify({
      path: "/tmp/other.json",
      baselineJson,
      documentJson: withTitle("編集中"),
    });
    const action = decideRecoveryStartup(path, other, baselineJson, null);
    expect(action.kind).toBe("openSaved");
    if (action.kind === "openSaved") {
      expect(action.path).toBe(path);
      expect(action.ignoredDraft).toBe(true);
    }
  });

  it("restores when disk formatting differs but canonical matches", () => {
    const doc = withTitle("編集中");
    const minified = JSON.stringify(JSON.parse(baselineJson));
    const action = decideRecoveryStartup(path, draftJson(doc), minified, null);
    expect(action.kind).toBe("restore");
    if (action.kind === "restore") {
      expect(action.baselineJson).toBe(baselineJson);
    }
  });

  it("returns invalidDisk when the file fails validation", () => {
    const doc = withTitle("編集中");
    const action = decideRecoveryStartup(
      path,
      draftJson(doc),
      "{",
      null,
    );
    expect(action.kind).toBe("invalidDisk");
  });
});
