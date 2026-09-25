import { describe, expect, it } from "vitest";
import { decideExternalReload } from "./scheduleExternalReload";
import { serializeScheduleDocument } from "./scheduleFile";
import { sampleCategories, sampleMilestones, SAMPLE_PROJECT_TITLE } from "../sample/schedule";

const baselineJson = serializeScheduleDocument(
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  sampleMilestones,
);

function withTitle(title: string): string {
  const data = JSON.parse(baselineJson) as { title: string };
  data.title = title;
  return JSON.stringify(data, null, 2);
}

describe("decideExternalReload", () => {
  it("returns invalid for broken JSON", () => {
    const result = decideExternalReload("{", baselineJson, false);
    expect(result.kind).toBe("invalid");
  });

  it("returns noop when canonical matches baseline", () => {
    const formatted = withTitle(SAMPLE_PROJECT_TITLE);
    const result = decideExternalReload(formatted, baselineJson, false);
    expect(result.kind).toBe("noop");
  });

  it("returns confirm when dirty and content differs", () => {
    const disk = withTitle("別タイトル");
    const result = decideExternalReload(disk, baselineJson, true);
    expect(result).toEqual({ kind: "confirm", diskContents: disk });
  });

  it("returns confirm when an edit dialog is open", () => {
    const disk = withTitle("別タイトル");
    const result = decideExternalReload(disk, baselineJson, false, true);
    expect(result).toEqual({ kind: "confirm", diskContents: disk });
  });

  it("returns apply when clean and content differs", () => {
    const disk = withTitle("別タイトル");
    const result = decideExternalReload(disk, baselineJson, false);
    expect(result.kind).toBe("apply");
    if (result.kind === "apply") {
      expect(result.document.title).toBe("別タイトル");
      expect(result.canonicalJson).not.toBe(baselineJson);
    }
  });
});
