/** write-schedule スキル（SKILL.md の name） */
export const WRITE_SCHEDULE_SKILL_NAME = "write-schedule";

/** 初回カードの「例文をコピー」用。tutorial.md の依頼文を短くしたもの。 */
export const FIRST_RUN_WRITE_SCHEDULE_EXAMPLE_PROMPT = `${WRITE_SCHEDULE_SKILL_NAME} スキルに従い、schedule-viewer 用のスケジュール JSON を1ファイルで作ってください。

- プロジェクトの title: 〇〇プロジェクト
- カテゴリ・グループ・タスクの名前と期間（start / end、confidence は committed か tentative）
- 担当が要るタスクには assigneeId（未割当は null）`;

export const FIRST_RUN_PREPARE_LLM_STEPS_LS_KEY =
  "schedule-viewer/first-run/prepare-llm-steps-visible";

export function readPrepareLlmStepsVisible(
  storage: Pick<Storage, "getItem"> = localStorage,
): boolean {
  try {
    return storage.getItem(FIRST_RUN_PREPARE_LLM_STEPS_LS_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPrepareLlmStepsVisible(
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  try {
    storage.setItem(FIRST_RUN_PREPARE_LLM_STEPS_LS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearPrepareLlmStepsVisible(
  storage: Pick<Storage, "removeItem"> = localStorage,
): void {
  try {
    storage.removeItem(FIRST_RUN_PREPARE_LLM_STEPS_LS_KEY);
  } catch {
    /* ignore */
  }
}
