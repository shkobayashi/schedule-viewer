import { invoke, isTauri } from "@tauri-apps/api/core";

export type ExportClaudeSkillsResult = {
  exportDir: string;
  zipPaths: string[];
  uploadHint: string;
};

export async function exportClaudeJsonSkillsZip(): Promise<ExportClaudeSkillsResult | null> {
  if (!isTauri()) {
    throw new Error("Claude 向け zip の書き出しはデスクトップ版でのみ使えます。");
  }
  return invoke<ExportClaudeSkillsResult | null>("export_claude_json_skills_zip");
}

export async function exportClaudeReadScreenSkillsZip(): Promise<ExportClaudeSkillsResult | null> {
  if (!isTauri()) {
    throw new Error("Claude 向け zip の書き出しはデスクトップ版でのみ使えます。");
  }
  return invoke<ExportClaudeSkillsResult | null>("export_claude_read_screen_skills_zip");
}
