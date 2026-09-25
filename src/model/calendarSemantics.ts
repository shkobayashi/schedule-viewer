import { isIsoDateString } from "./dates";
import type { CalendarDocument } from "./calendarTypes";
import type { ValidationIssue } from "./membersSemantics";

const UTC_DOW_TO_WEEKDAY = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export function utcWeekdayFromDate(d: Date): (typeof UTC_DOW_TO_WEEKDAY)[number] {
  return UTC_DOW_TO_WEEKDAY[d.getUTCDay()];
}

function validateDatedEntries(
  entries: CalendarDocument["nonWorkingDays"],
  basePath: string,
  label: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const path = `${basePath}/${i}/date`;
    if (!isIsoDateString(entry.date)) {
      issues.push({
        path,
        message: `${label}の date は実在する YYYY-MM-DD である必要があります`,
      });
    }
    if (seen.has(entry.date)) {
      issues.push({
        path,
        message: `${label}の date が重複しています`,
      });
    }
    seen.add(entry.date);
  }
  return issues;
}

export function validateCalendarSemantics(
  doc: CalendarDocument,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(
    ...validateDatedEntries(doc.nonWorkingDays, "/nonWorkingDays", "休日"),
  );
  issues.push(
    ...validateDatedEntries(doc.workingDays, "/workingDays", "振替出勤"),
  );

  const working = new Set(doc.workingDays.map((e) => e.date));
  for (let i = 0; i < doc.nonWorkingDays.length; i += 1) {
    const date = doc.nonWorkingDays[i].date;
    if (working.has(date)) {
      issues.push({
        path: `/nonWorkingDays/${i}/date`,
        message: "同じ日付が振替出勤にもあります",
      });
    }
  }

  return issues;
}
