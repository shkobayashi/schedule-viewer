import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteAppCalendar,
  importAppCalendar,
  readAppCalendar,
} from "./calendarAppData";

const memory = new Map<string, string>();

function installLocalStorage() {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
}

const validCalendar = JSON.stringify({
  schemaVersion: 1,
  weekends: ["sat", "sun"],
  nonWorkingDays: [{ date: "2026-01-01", name: "元日" }],
  workingDays: [],
});

afterEach(() => {
  memory.clear();
  vi.unstubAllGlobals();
});

describe("calendar app storage", () => {
  it("stores imported JSON and reads it back", async () => {
    installLocalStorage();
    await importAppCalendar("jp-2026.calendar.json", validCalendar);
    const doc = await readAppCalendar();
    expect(doc?.nonWorkingDays[0]?.date).toBe("2026-01-01");
    expect(memory.get("schedule-viewer/calendar/label")).toBe(
      "jp-2026.calendar.json",
    );
  });

  it("clears calendar on delete", async () => {
    installLocalStorage();
    await importAppCalendar("cal.json", validCalendar);
    await deleteAppCalendar();
    expect(await readAppCalendar()).toBeNull();
  });
});
