import { forEachTask } from "../model/tasks";
import type { Category } from "../model/types";

export const SAMPLE_PROJECT_TITLE = "AI活用PoC推進プロジェクト";

export const sampleCategories: Category[] = [
  {
    name: "要件定義",
    groups: [
      {
        name: "現状把握",
        tasks: [
          {
            id: 1,
            name: "現状業務ヒアリング",
            start: "2026-09-14",
            end: "2026-09-20",
            assignee: "田中",
            status: "done",
            progress: 100,
            predecessors: [],
          },
        ],
      },
      {
        name: "要件化",
        tasks: [
          {
            id: 2,
            name: "要件定義書作成",
            start: "2026-09-18",
            end: "2026-09-22",
            assignee: "佐藤",
            status: "in-progress",
            progress: 60,
            predecessors: [1],
          },
          {
            id: 3,
            name: "要件レビュー",
            start: "2026-09-29",
            end: "2026-10-02",
            assignee: "",
            status: "not-started",
            progress: 0,
            predecessors: [2],
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
            id: 4,
            name: "アーキテクチャ設計",
            start: "2026-09-25",
            end: "2026-10-09",
            assignee: "鈴木",
            status: "in-progress",
            progress: 30,
            predecessors: [3],
          },
        ],
      },
      {
        name: "実装",
        tasks: [
          {
            id: 5,
            name: "PoC環境構築",
            start: "2026-10-05",
            end: "2026-10-16",
            assignee: "",
            status: "not-started",
            progress: 0,
            predecessors: [4],
          },
          {
            id: 6,
            name: "プロトタイプ開発",
            start: "2026-10-13",
            end: "2026-11-06",
            assignee: "鈴木",
            status: "not-started",
            progress: 0,
            predecessors: [5],
          },
        ],
      },
      {
        name: "評価",
        tasks: [
          {
            id: 7,
            name: "評価・振り返り",
            start: "2026-11-06",
            end: "2026-11-13",
            assignee: "佐藤",
            status: "not-started",
            progress: 0,
            predecessors: [6],
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
            id: 8,
            name: "データ基盤設計",
            start: "2026-10-01",
            end: "2026-10-15",
            assignee: "高橋",
            status: "in-progress",
            progress: 45,
            predecessors: [],
          },
        ],
      },
      {
        name: "構築",
        tasks: [
          {
            id: 9,
            name: "基盤構築",
            start: "2026-10-15",
            end: "2026-11-12",
            assignee: "高橋",
            status: "not-started",
            progress: 0,
            predecessors: [8],
          },
          {
            id: 10,
            name: "セキュリティ設定",
            start: "2026-11-05",
            end: "2026-11-19",
            assignee: "鈴木",
            status: "not-started",
            progress: 0,
            predecessors: [9],
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
            id: 11,
            name: "データ移行",
            start: "2026-11-12",
            end: "2026-11-26",
            assignee: "田中",
            status: "not-started",
            progress: 0,
            predecessors: [9],
          },
        ],
      },
      {
        name: "検証",
        tasks: [
          {
            id: 12,
            name: "結合テスト",
            start: "2026-11-19",
            end: "2026-12-03",
            assignee: "佐藤",
            status: "not-started",
            progress: 0,
            predecessors: [6, 11],
          },
          {
            id: 13,
            name: "受け入れテスト",
            start: "2026-12-03",
            end: "2026-12-14",
            assignee: "",
            status: "not-started",
            progress: 0,
            predecessors: [12],
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
            id: 14,
            name: "リリース準備",
            start: "2026-12-10",
            end: "2026-12-18",
            assignee: "高橋",
            status: "not-started",
            progress: 0,
            predecessors: [10, 13],
          },
          {
            id: 15,
            name: "本番リリース",
            start: "2026-12-18",
            end: "2026-12-21",
            assignee: "鈴木",
            status: "not-started",
            progress: 0,
            predecessors: [14],
          },
        ],
      },
      {
        name: "引き渡し",
        tasks: [
          {
            id: 16,
            name: "運用引き継ぎ",
            start: "2026-12-21",
            end: "2027-01-08",
            assignee: "佐藤",
            status: "not-started",
            progress: 0,
            predecessors: [15],
          },
        ],
      },
    ],
  },
];

export function collectAssignees(categories: Category[]): string[] {
  const names: string[] = [];
  forEachTask(categories, (task) => {
    const assignee = task.assignee.trim();
    if (assignee && !names.includes(assignee)) names.push(assignee);
  });
  return names;
}

export function scheduleToJson(categories: Category[]) {
  return {
    categories: categories.map((category) => ({
      name: category.name,
      groups: category.groups.map((group) => ({
        name: group.name,
        tasks: group.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          start: task.start,
          end: task.end,
          assignee: task.assignee,
          status: task.status,
          progress: task.progress,
          predecessors: task.predecessors,
        })),
      })),
    })),
  };
}
