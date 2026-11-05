/** 初回案内カード「LLM に頼んでみる」のコピー用（Issue #478 軸） */
export const FIRST_RUN_TRY_LLM_PROMPT = "選んでいるタスクを 2 日後ろにずらして";

export const FIRST_RUN_TRY_LLM_UNDO_HINT =
  "うまくいかなかったら「やっぱり戻して」と頼むと、取り消しで戻せます。";

export type LlmRequestExample = {
  /** チャットへそのまま貼れる依頼文 */
  prompt: string;
  /** 利用者向けの補足（操作の案内・マニュアル） */
  hint: string;
};

/**
 * schedule-talk / MCP で実際にできる依頼の例（3〜5 個）。
 * 正本は Issue #478 と tutorial.md の「LLM に頼める例」。
 */
export const LLM_REQUEST_EXAMPLES: readonly LlmRequestExample[] = [
  {
    prompt: FIRST_RUN_TRY_LLM_PROMPT,
    hint: "タスクを1件選んでから。変更は未保存になり、保存するか取り消しで戻せます。",
  },
  {
    prompt: "やっぱり戻して",
    hint: "直前に LLM が入れた変更を、取り消しで1段戻します。",
  },
  {
    prompt: "設計が 1 週間遅れたら、リリースはどうなる？画面で見せて",
    hint: "計画ファイルは変えず、説明用の見え方で画面に試しの影響を重ねます。",
  },
  {
    prompt: "選んでいるタスクの前後のつながりを教えて",
    hint: "タスクを1件選んでから。読むだけの依頼です。",
  },
  {
    prompt: "未保存の変更を短く説明して",
    hint: "画面とファイルの差分を読んで説明します。保存はしません。",
  },
];

export function llmRequestExamplePrompts(): readonly string[] {
  return LLM_REQUEST_EXAMPLES.map((row) => row.prompt);
}
