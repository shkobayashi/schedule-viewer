import { isMcpInProgressCommitStale } from "./mcpInProgressInvalidation";

/** タスクバー移動・期間変更の確定を、MCP 読み取りの世代進行後は拒否する。 */
export function shouldApplyTimelineDragCommit(
  requestedCommit: boolean,
  capturedGeneration: number,
): boolean {
  if (!requestedCommit) return false;
  return !isMcpInProgressCommitStale(capturedGeneration);
}
