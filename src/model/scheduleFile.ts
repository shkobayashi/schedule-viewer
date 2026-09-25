import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Category, Milestone, ScheduleDocument } from "./types";
import {
  formatValidationErrors,
  validateSchedule,
} from "./validateSchedule";
import { scheduleJsonFilename as jsonFilenameFromTitle } from "./exportFilename";
import { scheduleToJson } from "./serialize";

export type ScheduleFilePick = {
  path: string | null;
  /** ブラウザで開いたときの表示名（path が null のとき） */
  displayName?: string | null;
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

export async function acceptOpenedScheduleViaTauri(
  path: string,
  contents: string,
): Promise<void> {
  await invoke("accept_opened_schedule", { path, contents });
}

export const DISK_HASH_MISMATCH = "DISK_HASH_MISMATCH";

export const SCHEDULE_FILE_NOT_FOUND = "SCHEDULE_FILE_NOT_FOUND";

export async function hashTextSha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function checkScheduleFileChangedViaTauri(): Promise<boolean> {
  return invoke<boolean>("check_schedule_file_changed");
}

export type PollScheduleFileUpdateResult = {
  contents: string;
};

export async function pollScheduleFileUpdateViaTauri(): Promise<PollScheduleFileUpdateResult | null> {
  return invoke<PollScheduleFileUpdateResult | null>(
    "poll_schedule_file_update",
  );
}

export async function acknowledgeScheduleFileContentsViaTauri(
  contents: string,
): Promise<void> {
  await invoke("acknowledge_schedule_file_contents", { contents });
}

export async function saveScheduleViaTauri(
  saveAs: boolean,
  contents: string,
  suggestedName: string,
  expectedPath: string | null,
  skipDiskHashCheck: boolean,
): Promise<string | null> {
  return invoke<string | null>("save_schedule_file", {
    saveAs,
    contents,
    suggestedName,
    expectedPath,
    skipDiskHashCheck,
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
          displayName: file.name,
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
  return jsonFilenameFromTitle(title);
}

export type ScheduleRecoveryDraft = {
  path: string;
  baselineJson: string;
  documentJson: string;
};

export async function readScheduleRecoveryViaTauri(): Promise<string | null> {
  return invoke<string | null>("read_schedule_recovery");
}

export async function writeScheduleRecoveryViaTauri(
  draft: ScheduleRecoveryDraft,
): Promise<void> {
  await invoke("write_schedule_recovery", {
    contents: JSON.stringify(draft),
  });
}

export async function deleteScheduleRecoveryViaTauri(): Promise<void> {
  await invoke("delete_schedule_recovery");
}

export async function readScheduleFileAtPathViaTauri(
  path: string,
): Promise<string> {
  return invoke<string>("read_schedule_file_at_path", { path });
}

export { isTauri };
