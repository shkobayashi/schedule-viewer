import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Category, Milestone, ScheduleDocument } from "./types";
import {
  formatValidationErrors,
  validateSchedule,
} from "./validateSchedule";
import { scheduleToJson } from "../sample/schedule";

export type ScheduleFilePick = {
  path: string | null;
  contents: string;
};

export type ParseScheduleResult =
  | { ok: true; document: ScheduleDocument; canonicalJson: string }
  | { ok: false; message: string };

export function scheduleJsonFilename(path: string | null): string | null {
  if (!path) return null;
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function serializeScheduleDocument(
  title: string,
  categories: Category[],
  milestones: Milestone[],
): string {
  return JSON.stringify(scheduleToJson(title, categories, milestones), null, 2);
}

export function parseScheduleText(text: string): ParseScheduleResult {
  const normalized = text.replace(/^\uFEFF/, "");
  let data: unknown;
  try {
    data = JSON.parse(normalized);
  } catch {
    return { ok: false, message: "JSON の形式が正しくありません。" };
  }

  const result = validateSchedule(data);
  if (!result.ok) {
    return {
      ok: false,
      message: formatValidationErrors(result.errors),
    };
  }

  const canonicalJson = serializeScheduleDocument(
    result.document.title,
    result.document.categories,
    result.document.milestones,
  );
  return { ok: true, document: result.document, canonicalJson };
}

export async function openScheduleViaTauri(): Promise<ScheduleFilePick | null> {
  const result = await invoke<{ path: string; contents: string } | null>(
    "open_schedule_file",
  );
  if (!result) return null;
  return { path: result.path, contents: result.contents };
}

export async function checkScheduleFileChangedViaTauri(): Promise<boolean> {
  return invoke<boolean>("check_schedule_file_changed");
}

export async function saveScheduleViaTauri(
  saveAs: boolean,
  contents: string,
  suggestedName: string,
): Promise<string | null> {
  return invoke<string | null>("save_schedule_file", {
    saveAs,
    contents,
    suggestedName,
  });
}

export function openScheduleViaBrowserInput(): Promise<ScheduleFilePick | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);
    const cleanup = () => {
      input.remove();
    };
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
          path: null,
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

export function downloadScheduleJson(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function suggestedJsonFilename(title: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, "_").trim();
  if (!safe) return "schedule.json";
  return safe.endsWith(".json") ? safe : `${safe}.json`;
}

export { isTauri };
