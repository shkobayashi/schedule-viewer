import { invoke, isTauri } from "@tauri-apps/api/core";

import type { JsonSkillTools } from "./jsonSkills";

export type InstallReadScreenSkillParams = {
  tools: JsonSkillTools;
  replace: boolean;
};

export type InstallReadScreenSkillResult = {
  installedPaths: string[];
  existingPaths: string[];
  executablePath: string;
};

export type UninstallReadScreenSkillParams = {
  tools: JsonSkillTools;
};

export type UninstallReadScreenSkillResult = {
  removedPaths: string[];
  missingPaths: string[];
};

export async function installReadScreenSkill(
  params: InstallReadScreenSkillParams,
): Promise<InstallReadScreenSkillResult> {
  if (!isTauri()) {
    throw new Error("画面の状態を読むスキルはデスクトップ版でのみ置けます。");
  }
  return invoke<InstallReadScreenSkillResult>("install_read_screen_skill", {
    params,
  });
}

export async function uninstallReadScreenSkill(
  params: UninstallReadScreenSkillParams,
): Promise<UninstallReadScreenSkillResult> {
  if (!isTauri()) {
    throw new Error("画面の状態を読むスキルはデスクトップ版でのみ外せます。");
  }
  return invoke<UninstallReadScreenSkillResult>("uninstall_read_screen_skill", {
    params,
  });
}
