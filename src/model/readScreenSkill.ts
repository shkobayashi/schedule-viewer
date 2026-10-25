import { invoke, isTauri } from "@tauri-apps/api/core";

import type { JsonSkillToolSelection } from "./jsonSkills";

export type InstallReadScreenSkillParams = JsonSkillToolSelection & {
  replace: boolean;
};

export type InstallReadScreenSkillResult = {
  installedPaths: string[];
  existingPaths: string[];
  executablePath: string;
};

export type UninstallReadScreenSkillParams = JsonSkillToolSelection;

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
