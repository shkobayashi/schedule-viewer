import { scheduleToJson } from "../model/serialize";
import type { Milestone, MilestoneGroup, ScheduleDocument } from "../model/types";
import { sampleCategories } from "./schedule";
import { SAMPLE_MILESTONE_IDS } from "./ids";

export const PLAYGROUND_PROJECT_TITLE =
  "AI活用PoC推進プロジェクト（playground）";

const PLAYGROUND_MILESTONE_GROUP_IDS = {
  approval: "e1000001-0000-4000-8000-000000000011",
  delivery: "e1000001-0000-4000-8000-000000000012",
  overlapDemo: "e1000001-0000-4000-8000-000000000013",
} as const;

const PLAYGROUND_MILESTONE_IDS = {
  execApproval:
    "a1000001-0000-4000-8000-000000000011",
  contractSigned:
    "a1000001-0000-4000-8000-000000000012",
  requirements: SAMPLE_MILESTONE_IDS.requirements,
  designSignoff:
    "a1000001-0000-4000-8000-000000000013",
  pocDone: SAMPLE_MILESTONE_IDS.pocDone,
  release: SAMPLE_MILESTONE_IDS.release,
  kickoff: "a1000001-0000-4000-8000-000000000021",
  securityReview: "a1000001-0000-4000-8000-000000000022",
  dataLinkTest: "a1000001-0000-4000-8000-000000000023",
  uatStart: "a1000001-0000-4000-8000-000000000024",
  stakeholderOk: "a1000001-0000-4000-8000-000000000025",
} as const;

export const playgroundMilestoneGroups: MilestoneGroup[] = [
  { id: PLAYGROUND_MILESTONE_GROUP_IDS.approval, name: "承認・契約" },
  { id: PLAYGROUND_MILESTONE_GROUP_IDS.delivery, name: "開発・リリース" },
  {
    id: PLAYGROUND_MILESTONE_GROUP_IDS.overlapDemo,
    name: "同日重なり（デモ）",
  },
];

export const playgroundMilestones: Milestone[] = [
  {
    id: PLAYGROUND_MILESTONE_IDS.execApproval,
    name: "事業部長承認（経営会議付議前の前提確認）",
    date: "2026-09-22",
    confidence: "tentative",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.approval,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.contractSigned,
    name: "契約締結・発注完了（調達・法務サインオフ済み）",
    date: "2026-09-28",
    confidence: "committed",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.approval,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.requirements,
    name: "要件確定（スコープ・受入条件の合意）",
    date: "2026-10-02",
    confidence: "committed",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.delivery,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.designSignoff,
    name: "設計レビュー完了（アーキテクチャサインオフ）",
    date: "2026-10-03",
    confidence: "tentative",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.delivery,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.pocDone,
    name: "PoC完了（評価指標クリア・次フェーズ判定）",
    date: "2026-11-13",
    confidence: "committed",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.delivery,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.release,
    name: "本番リリース（全社展開開始・運用移管）",
    date: "2026-12-21",
    confidence: "tentative",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.delivery,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.kickoff,
    name: "キックオフ（全社向け説明会・Q&A）",
    date: "2026-10-15",
    confidence: "committed",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.overlapDemo,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.securityReview,
    name: "セキュリティレビュー通過（脆弱性対応完了）",
    date: "2026-10-15",
    confidence: "tentative",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.overlapDemo,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.dataLinkTest,
    name: "データ連携試験完了（本番相当環境）",
    date: "2026-10-15",
    confidence: "committed",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.overlapDemo,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.uatStart,
    name: "UAT開始宣言（受入テスト観点の合意）",
    date: "2026-10-15",
    confidence: "tentative",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.overlapDemo,
  },
  {
    id: PLAYGROUND_MILESTONE_IDS.stakeholderOk,
    name: "ステークホルダー合意形成（例外運用の了承）",
    date: "2026-10-15",
    confidence: "committed",
    groupId: PLAYGROUND_MILESTONE_GROUP_IDS.overlapDemo,
  },
];

export function playgroundScheduleDocument(): ScheduleDocument {
  return scheduleToJson(
    PLAYGROUND_PROJECT_TITLE,
    sampleCategories,
    playgroundMilestoneGroups,
    playgroundMilestones,
  );
}
