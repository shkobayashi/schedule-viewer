import { invoke, isTauri } from "@tauri-apps/api/core";
import type { CalendarDocument } from "./calendarTypes";
import {
  formatCalendarValidationErrors,
  validateCalendar,
} from "./validateCalendar";
import { stripUtf8Bom } from "./memberAppData";

export type AppCalendarState = {
  label: string | null;
};

const LS_BODY = "schedule-viewer/calendar/body";
const LS_LABEL = "schedule-viewer/calendar/label";

function readBrowserBody(): string | null {
  const value = localStorage.getItem(LS_BODY);
  return value && value.length > 0 ? value : null;
}

function readBrowserLabel(): string | null {
  const value = localStorage.getItem(LS_LABEL);
  return value && value.length > 0 ? value : null;
}

function writeBrowserCalendar(label: string, body: string): void {
  localStorage.setItem(LS_BODY, body);
  localStorage.setItem(LS_LABEL, label);
}

function clearBrowserCalendar(): void {
  localStorage.removeItem(LS_BODY);
  localStorage.removeItem(LS_LABEL);
}

export async function loadAppCalendarState(): Promise<AppCalendarState> {
  if (isTauri()) {
    return invoke<AppCalendarState>("get_calendar_state");
  }
  return { label: readBrowserLabel() };
}

export function parseCalendarText(text: string): CalendarDocument {
  let data: unknown;
  try {
    data = JSON.parse(stripUtf8Bom(text));
  } catch {
    throw new Error("カレンダー JSON の形式が正しくありません。");
  }
  const result = validateCalendar(data);
  if (!result.ok) {
    throw new Error(formatCalendarValidationErrors(result.errors));
  }
  return result.document;
}

export async function readAppCalendar(): Promise<CalendarDocument | null> {
  if (isTauri()) {
    const text = await invoke<string | null>("read_app_calendar");
    if (text == null) return null;
    return parseCalendarText(text);
  }
  const body = readBrowserBody();
  if (!body) return null;
  return parseCalendarText(body);
}

export async function importAppCalendar(
  label: string,
  contents: string,
): Promise<void> {
  const safeLabel = label.trim();
  if (!safeLabel) {
    throw new Error("ファイル名が空です。");
  }
  const body = stripUtf8Bom(contents);
  parseCalendarText(body);
  if (isTauri()) {
    await invoke("import_app_calendar", {
      label: safeLabel,
      contents: body,
    });
    return;
  }
  writeBrowserCalendar(safeLabel, body);
}

export async function deleteAppCalendar(): Promise<void> {
  if (isTauri()) {
    await invoke("delete_app_calendar");
    return;
  }
  clearBrowserCalendar();
}

export function pickCalendarJsonFile(): Promise<{
  name: string;
  contents: string;
} | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);
    const cleanup = () => input.remove();
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve({
          name: file.name,
          contents: String(reader.result ?? ""),
        });
      };
      reader.onerror = () => {
        cleanup();
        resolve(null);
      };
      reader.readAsText(file);
    });
    input.addEventListener("cancel", () => {
      cleanup();
      resolve(null);
    });
    input.click();
  });
}

export function calendarLabelFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  return base.trim() || "calendar.json";
}
