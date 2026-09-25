export const CALENDAR_SCHEMA_VERSION = 1;

export type Weekday =
  | "sun"
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat";

export type CalendarDatedEntry = {
  date: string;
  name?: string;
};

export type CalendarDocument = {
  schemaVersion: typeof CALENDAR_SCHEMA_VERSION;
  weekends: Weekday[];
  nonWorkingDays: CalendarDatedEntry[];
  workingDays: CalendarDatedEntry[];
};
