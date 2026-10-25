import { invoke, isTauri } from "@tauri-apps/api/core";

export type JsonSkillToolSelection = {
  cursor: boolean;
  claude: boolean;
  copilot: boolean;
};

export type JsonSkillScope = "user" | "project";

export type JsonSkillHomeDirs = {
  cursor: boolean;
  claude: boolean;
  copilot: boolean;
};

export type InstallJsonSkillsParams = JsonSkillToolSelection & {
  scope: JsonSkillScope;
  projectFolder: string | null;
  replace: boolean;
};

export type InstallJsonSkillsResult = {
  installedPaths: string[];
  existingPaths: string[];
  claudeUserShadows: string[];
};

export type UninstallJsonSkillsParams = JsonSkillToolSelection & {
  scope: JsonSkillScope;
  projectFolder: string | null;
};

export type UninstallJsonSkillsResult = {
  removedPaths: string[];
  missingPaths: string[];
};

export async function fetchJsonSkillHomeDirs(): Promise<JsonSkillHomeDirs> {
  if (!isTauri()) {
    return { cursor: false, claude: false, copilot: false };
  }
  return invoke<JsonSkillHomeDirs>("json_skill_home_dirs");
}

export async function pickJsonSkillFolder(): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }
  return invoke<string | null>("pick_json_skill_folder");
}

export async function installJsonSkills(
  params: InstallJsonSkillsParams,
): Promise<InstallJsonSkillsResult> {
  if (!isTauri()) {
    throw new Error("JSON作成スキルはデスクトップ版でのみ置けます。");
  }
  return invoke<InstallJsonSkillsResult>("install_json_skills", { params });
}

export async function uninstallJsonSkills(
  params: UninstallJsonSkillsParams,
): Promise<UninstallJsonSkillsResult> {
  if (!isTauri()) {
    throw new Error("JSON作成スキルはデスクトップ版でのみ外せます。");
  }
  return invoke<UninstallJsonSkillsResult>("uninstall_json_skills", { params });
}

export function defaultJsonSkillToolSelection(
  homeDirs: JsonSkillHomeDirs,
): JsonSkillToolSelection {
  const any =
    homeDirs.cursor || homeDirs.claude || homeDirs.copilot;
  if (!any) {
    return { cursor: true, claude: true, copilot: true };
  }
  return {
    cursor: homeDirs.cursor,
    claude: homeDirs.claude,
    copilot: homeDirs.copilot,
  };
}

export function hasJsonSkillToolSelection(
  tools: JsonSkillToolSelection,
): boolean {
  return tools.cursor || tools.claude || tools.copilot;
}
