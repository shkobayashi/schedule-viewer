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

const BROWSER_STORAGE_ERROR = "ブラウザの保存領域に書けませんでした。";
const MAX_CALENDAR_BYTES = 2 * 1024 * 1024;

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

function restoreBrowserCalendar(body: string | null, label: string | null): void {
  if (body == null) localStorage.removeItem(LS_BODY);
  else localStorage.setItem(LS_BODY, body);
  if (label == null) localStorage.removeItem(LS_LABEL);
  else localStorage.setItem(LS_LABEL, label);
}

function writeBrowserCalendar(label: string, body: string): void {
  const previousBody = localStorage.getItem(LS_BODY);
  const previousLabel = localStorage.getItem(LS_LABEL);
  try {
    localStorage.setItem(LS_BODY, body);
    localStorage.setItem(LS_LABEL, label);
  } catch {
    try {
      restoreBrowserCalendar(previousBody, previousLabel);
    } catch {
      // 戻す書き込みも失敗したときは、先のエラーを利用者に返す。
    }
    throw new Error(BROWSER_STORAGE_ERROR);
  }
}

function clearBrowserCalendar(): void {
  const previousBody = localStorage.getItem(LS_BODY);
  const previousLabel = localStorage.getItem(LS_LABEL);
  try {
    localStorage.removeItem(LS_BODY);
    localStorage.removeItem(LS_LABEL);
  } catch {
    try {
      restoreBrowserCalendar(previousBody, previousLabel);
    } catch {
      // 戻す書き込みも失敗したときは、先のエラーを利用者に返す。
    }
    throw new Error(BROWSER_STORAGE_ERROR);
  }
}

export async function loadAppCalendarState(): Promise<AppCalendarState> {
  if (isTauri()) {
    return invoke<AppCalendarState>("get_calendar_state");
  }
  return { label: readBrowserLabel() };
}

export type LoadedAppCalendar = {
  label: string | null;
  document: CalendarDocument | null;
  error: string | null;
};

/** 表示名と本文を揃える。本文が無い表示名は消し、本文が壊れているときはエラーと表示名を残す。 */
export async function loadResolvedAppCalendar(): Promise<LoadedAppCalendar> {
  const state = await loadAppCalendarState();
  if (isTauri()) {
    const text = await invoke<string | null>("read_app_calendar");
    if (text == null) {
      if (state.label) await deleteAppCalendar();
      return { label: null, document: null, error: null };
    }
    return resolveCalendarBody(state.label, text);
  }
  const body = readBrowserBody();
  if (!body) {
    if (readBrowserLabel()) clearBrowserCalendar();
    return { label: null, document: null, error: null };
  }
  return resolveCalendarBody(readBrowserLabel(), body);
}

function resolveCalendarBody(
  label: string | null,
  body: string,
): LoadedAppCalendar {
  const displayLabel = label && label.length > 0 ? label : "calendar.json";
  try {
    return {
      label: displayLabel,
      document: parseCalendarText(body),
      error: null,
    };
  } catch (err) {
    return {
      label: displayLabel,
      document: null,
      error:
        err instanceof Error
          ? err.message
          : "カレンダー設定を読み込めませんでした。",
    };
  }
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
  return new Promise((resolve, reject) => {
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
      if (file.size > MAX_CALENDAR_BYTES) {
        cleanup();
        reject(new Error("カレンダーファイルが大きすぎます（上限 2 MB）"));
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
