import { scheduleToJson } from "../model/serialize";
import type { Category, Milestone, ScheduleDocument } from "../model/types";
import { SAMPLE_MILESTONE_IDS, SAMPLE_MEMBER_IDS, SAMPLE_TASK_IDS } from "./ids";

export const SAMPLE_PROJECT_TITLE = "AI活用PoC推進プロジェクト";

export const sampleMilestones: Milestone[] = [
  {
    id: SAMPLE_MILESTONE_IDS.requirements,
    name: "要件確定",
    date: "2026-10-02",
  },
  {
    id: SAMPLE_MILESTONE_IDS.pocDone,
    name: "PoC完了",
    date: "2026-11-13",
  },
  {
    id: SAMPLE_MILESTONE_IDS.release,
    name: "本番リリース",
    date: "2026-12-21",
  },
];

export const sampleCategories: Category[] = [
  {
    name: "要件定義",
    groups: [
      {
        name: "現状把握",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t01,
            name: "現状業務ヒアリング",
            start: "2026-09-14",
            end: "2026-09-19",
            assigneeId: SAMPLE_MEMBER_IDS.tanaka,
            status: "done",
            progress: 100,
            predecessors: [],
            milestoneId: SAMPLE_MILESTONE_IDS.requirements,
          },
        ],
      },
      {
        name: "要件化",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t02,
            name: "要件定義書作成",
            start: "2026-09-18",
            end: "2026-09-21",
            assigneeId: SAMPLE_MEMBER_IDS.sato,
            status: "in-progress",
            progress: 60,
            predecessors: [SAMPLE_TASK_IDS.t01],
            milestoneId: SAMPLE_MILESTONE_IDS.requirements,
          },
          {
            id: SAMPLE_TASK_IDS.t03,
            name: "要件レビュー",
            start: "2026-09-29",
            end: "2026-10-01",
            assigneeId: null,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t02],
            milestoneId: SAMPLE_MILESTONE_IDS.requirements,
          },
        ],
      },
    ],
  },
  {
    name: "PoC設計・開発",
    groups: [
      {
        name: "設計",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t04,
            name: "アーキテクチャ設計",
            start: "2026-09-25",
            end: "2026-10-08",
            assigneeId: SAMPLE_MEMBER_IDS.suzuki,
            status: "in-progress",
            progress: 30,
            predecessors: [SAMPLE_TASK_IDS.t03],
            milestoneId: SAMPLE_MILESTONE_IDS.requirements,
          },
        ],
      },
      {
        name: "実装",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t05,
            name: "PoC環境構築",
            start: "2026-10-05",
            end: "2026-10-15",
            assigneeId: null,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t04],
            milestoneId: SAMPLE_MILESTONE_IDS.pocDone,
          },
          {
            id: SAMPLE_TASK_IDS.t06,
            name: "プロトタイプ開発",
            start: "2026-10-13",
            end: "2026-11-05",
            assigneeId: SAMPLE_MEMBER_IDS.suzuki,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t05],
            milestoneId: SAMPLE_MILESTONE_IDS.pocDone,
          },
        ],
      },
      {
        name: "評価",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t07,
            name: "評価・振り返り",
            start: "2026-11-06",
            end: "2026-11-12",
            assigneeId: SAMPLE_MEMBER_IDS.sato,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t06],
            milestoneId: SAMPLE_MILESTONE_IDS.pocDone,
          },
        ],
      },
    ],
  },
  {
    name: "基盤構築",
    groups: [
      {
        name: "設計",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t08,
            name: "データ基盤設計",
            start: "2026-10-01",
            end: "2026-10-14",
            assigneeId: SAMPLE_MEMBER_IDS.takahashi,
            status: "in-progress",
            progress: 45,
            predecessors: [],
            milestoneId: null,
          },
        ],
      },
      {
        name: "構築",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t09,
            name: "基盤構築",
            start: "2026-10-15",
            end: "2026-11-11",
            assigneeId: SAMPLE_MEMBER_IDS.takahashi,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t08],
            milestoneId: null,
          },
          {
            id: SAMPLE_TASK_IDS.t10,
            name: "セキュリティ設定",
            start: "2026-11-05",
            end: "2026-11-18",
            assigneeId: SAMPLE_MEMBER_IDS.suzuki,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t09],
            milestoneId: null,
          },
        ],
      },
    ],
  },
  {
    name: "移行・テスト",
    groups: [
      {
        name: "移行",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t11,
            name: "データ移行",
            start: "2026-11-12",
            end: "2026-11-25",
            assigneeId: SAMPLE_MEMBER_IDS.tanaka,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t09],
            milestoneId: null,
          },
        ],
      },
      {
        name: "検証",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t12,
            name: "結合テスト",
            start: "2026-11-19",
            end: "2026-12-02",
            assigneeId: SAMPLE_MEMBER_IDS.sato,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t06, SAMPLE_TASK_IDS.t11],
            milestoneId: null,
          },
          {
            id: SAMPLE_TASK_IDS.t13,
            name: "受け入れテスト",
            start: "2026-12-03",
            end: "2026-12-13",
            assigneeId: null,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t12],
            milestoneId: null,
          },
        ],
      },
    ],
  },
  {
    name: "リリース",
    groups: [
      {
        name: "展開",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t14,
            name: "リリース準備",
            start: "2026-12-10",
            end: "2026-12-17",
            assigneeId: SAMPLE_MEMBER_IDS.takahashi,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t10, SAMPLE_TASK_IDS.t13],
            milestoneId: SAMPLE_MILESTONE_IDS.release,
          },
          {
            id: SAMPLE_TASK_IDS.t15,
            name: "本番リリース",
            start: "2026-12-18",
            end: "2026-12-20",
            assigneeId: SAMPLE_MEMBER_IDS.suzuki,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t14],
            milestoneId: SAMPLE_MILESTONE_IDS.release,
          },
        ],
      },
      {
        name: "引き渡し",
        tasks: [
          {
            id: SAMPLE_TASK_IDS.t16,
            name: "運用引き継ぎ",
            start: "2026-12-21",
            end: "2027-01-07",
            assigneeId: SAMPLE_MEMBER_IDS.sato,
            status: "not-started",
            progress: 0,
            predecessors: [SAMPLE_TASK_IDS.t15],
            milestoneId: null,
          },
        ],
      },
    ],
  },
];

export function sampleScheduleDocument(): ScheduleDocument {
  return scheduleToJson(
    SAMPLE_PROJECT_TITLE,
    sampleCategories,
    sampleMilestones,
  );
}
