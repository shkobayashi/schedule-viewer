import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Member } from "../model/memberTypes";
import { parseScheduleText } from "../model/scheduleFile";
import type { ScheduleDocument } from "../model/types";
import { validateMembers } from "../model/validateMembers";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function loadRegressionSchedule(name: string): ScheduleDocument {
  return parseScheduleFile(join(repoRoot, "examples/regression", name));
}

export function loadExampleSchedule(name: string): ScheduleDocument {
  return parseScheduleFile(join(repoRoot, "examples", name));
}

export function loadRegressionMembers(): Member[] {
  const data: unknown = JSON.parse(
    readFileSync(join(repoRoot, "examples/regression/members.json"), "utf8"),
  );
  const parsed = validateMembers(data);
  if (!parsed.ok) {
    throw new Error("メンバー JSON を読めません");
  }
  return parsed.document.members;
}

export function readRegressionText(name: string): string {
  return readFileSync(join(repoRoot, "examples/regression", name), "utf8");
}

function parseScheduleFile(path: string): ScheduleDocument {
  const parsed = parseScheduleText(readFileSync(path, "utf8"));
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }
  return parsed.document;
}
