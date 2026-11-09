import { expect } from "vitest";
import { parseScheduleText } from "../model/scheduleFile";
import type { ScheduleDocument } from "../model/types";
import type { HeadlessSchedule } from "./headlessScheduleSession";

export async function commitDocument(
  session: HeadlessSchedule,
  document: ScheduleDocument,
) {
  const result = await session.run({ tool: "commitDocument", document });
  expect(result.ok, result.message).toBe(true);
  return result;
}

export function parseDoc(json: string): ScheduleDocument {
  const parsed = parseScheduleText(json);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.document;
}
