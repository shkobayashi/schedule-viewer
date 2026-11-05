import { isMcpInProgressCommitStale } from "./mcpInProgressInvalidation";

/** MCP 読み取り中に世代が進んだあとは、タスクバー本体移動と未選択ハンドルの確定を書き込まない。選択中ハンドルは従来どおり世代を見ない。 */
export function shouldApplyTimelineDragCommit(
  requestedCommit: boolean,
  capturedGeneration: number,
): boolean {
  if (!requestedCommit) return false;
  return !isMcpInProgressCommitStale(capturedGeneration);
}
