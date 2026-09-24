#!/usr/bin/env node
/**
 * schedule-viewer 用スケジュール JSON の検証（依存パッケージなし）。
 * 意味規則は src/model/scheduleSemantics.ts と揃える。改定時は update-schedule-schema に従い両方を更新する。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TASK_STATUSES = new Set(["not-started", "in-progress", "done"]);

function isIsoDateString(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return value === `${parsed.getFullYear()}-${month}-${day}`;
}

function isUuid(value) {
  return typeof value === "string" && UUID.test(value);
}

function push(issues, path, message) {
  issues.push({ path, message });
}

function nonEmptyName(value, label, path, issues) {
  if (typeof value !== "string" || value.trim().length === 0) {
    push(issues, path, `${label}は空白にできません`);
  }
}

function validateStructure(doc, issues) {
  if (doc == null || typeof doc !== "object" || Array.isArray(doc)) {
    push(issues, "/", "オブジェクトである必要があります");
    return;
  }
  const keys = Object.keys(doc);
  for (const key of keys) {
    if (!["schemaVersion", "title", "milestones", "categories"].includes(key)) {
      push(issues, `/${key}`, "未知のプロパティです");
    }
  }
  if (doc.schemaVersion !== 1) {
    push(issues, "/schemaVersion", "schemaVersion は 1 である必要があります");
  }
  if (typeof doc.title !== "string" || doc.title.length < 1) {
    push(issues, "/title", "title は 1 文字以上の文字列である必要があります");
  }
  if (!Array.isArray(doc.milestones)) {
    push(issues, "/milestones", "配列である必要があります");
    return;
  }
  if (!Array.isArray(doc.categories) || doc.categories.length < 1) {
    push(issues, "/categories", "1 件以上のカテゴリが必要です");
    return;
  }

  for (let i = 0; i < doc.milestones.length; i += 1) {
    const m = doc.milestones[i];
    const base = `/milestones/${i}`;
    if (m == null || typeof m !== "object" || Array.isArray(m)) {
      push(issues, base, "オブジェクトである必要があります");
      continue;
    }
    for (const key of Object.keys(m)) {
      if (!["id", "name", "date"].includes(key)) {
        push(issues, `${base}/${key}`, "未知のプロパティです");
      }
    }
    if (!isUuid(m.id)) push(issues, `${base}/id`, "UUID 形式である必要があります");
    nonEmptyName(m.name, "マイルストン名", `${base}/name`, issues);
    if (!isIsoDateString(m.date)) {
      push(issues, `${base}/date`, "有効な日付ではありません");
    }
  }

  for (let ci = 0; ci < doc.categories.length; ci += 1) {
    const category = doc.categories[ci];
    const catPath = `/categories/${ci}`;
    if (category == null || typeof category !== "object" || Array.isArray(category)) {
      push(issues, catPath, "オブジェクトである必要があります");
      continue;
    }
    nonEmptyName(category.name, "カテゴリ名", `${catPath}/name`, issues);
    if (!Array.isArray(category.groups) || category.groups.length < 1) {
      push(issues, `${catPath}/groups`, "1 件以上のグループが必要です");
      continue;
    }
    for (let gi = 0; gi < category.groups.length; gi += 1) {
      const group = category.groups[gi];
      const groupPath = `${catPath}/groups/${gi}`;
      nonEmptyName(group.name, "グループ名", `${groupPath}/name`, issues);
      if (!Array.isArray(group.tasks) || group.tasks.length < 1) {
        push(issues, `${groupPath}/tasks`, "1 件以上のタスクが必要です");
        continue;
      }
      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti];
        const taskPath = `${groupPath}/tasks/${ti}`;
        if (task == null || typeof task !== "object" || Array.isArray(task)) {
          push(issues, taskPath, "オブジェクトである必要があります");
          continue;
        }
        const required = [
          "id",
          "name",
          "start",
          "end",
          "assignee",
          "status",
          "progress",
          "predecessors",
          "milestoneId",
        ];
        for (const key of required) {
          if (!(key in task)) push(issues, `${taskPath}/${key}`, "必須です");
        }
        if (!isUuid(task.id)) push(issues, `${taskPath}/id`, "UUID 形式である必要があります");
        nonEmptyName(task.name, "タスク名", `${taskPath}/name`, issues);
        if (typeof task.assignee !== "string") {
          push(issues, `${taskPath}/assignee`, "文字列である必要があります");
        }
        if (!TASK_STATUSES.has(task.status)) {
          push(issues, `${taskPath}/status`, "status が不正です");
        }
        if (
          typeof task.progress !== "number" ||
          !Number.isInteger(task.progress) ||
          task.progress < 0 ||
          task.progress > 100
        ) {
          push(issues, `${taskPath}/progress`, "0〜100 の整数である必要があります");
        }
        if (!Array.isArray(task.predecessors)) {
          push(issues, `${taskPath}/predecessors`, "配列である必要があります");
        } else {
          for (let pi = 0; pi < task.predecessors.length; pi += 1) {
            if (!isUuid(task.predecessors[pi])) {
              push(
                issues,
                `${taskPath}/predecessors/${pi}`,
                "UUID 形式である必要があります",
              );
            }
          }
        }
        if (
          task.milestoneId !== null &&
          (typeof task.milestoneId !== "string" || !isUuid(task.milestoneId))
        ) {
          push(issues, `${taskPath}/milestoneId`, "null または UUID である必要があります");
        }
      }
    }
  }
}

function validateSemantics(doc, issues) {
  if (typeof doc.title === "string") {
    nonEmptyName(doc.title, "title", "/title", issues);
  }

  const milestoneIds = new Set();
  if (Array.isArray(doc.milestones)) {
    for (let i = 0; i < doc.milestones.length; i += 1) {
      const milestone = doc.milestones[i];
      if (!milestone || !isUuid(milestone.id)) continue;
      if (milestoneIds.has(milestone.id)) {
        push(issues, `/milestones/${i}/id`, "マイルストン ID が重複しています");
      }
      milestoneIds.add(milestone.id);
    }
  }

  const allTaskIds = new Set();
  const seenTaskIds = new Set();
  const categoryNames = new Set();
  if (!Array.isArray(doc.categories)) return;

  for (const category of doc.categories) {
    if (!category || !Array.isArray(category.groups)) continue;
    for (const group of category.groups) {
      if (!group || !Array.isArray(group.tasks)) continue;
      for (const task of group.tasks) {
        if (task && isUuid(task.id)) allTaskIds.add(task.id);
      }
    }
  }

  for (let ci = 0; ci < doc.categories.length; ci += 1) {
    const category = doc.categories[ci];
    if (!category) continue;
    if (typeof category.name === "string") {
      if (categoryNames.has(category.name)) {
        push(issues, `/categories/${ci}/name`, "カテゴリ名が重複しています");
      }
      categoryNames.add(category.name);
    }
    const groupNames = new Set();
    if (!Array.isArray(category.groups)) continue;
    for (let gi = 0; gi < category.groups.length; gi += 1) {
      const group = category.groups[gi];
      if (!group) continue;
      if (typeof group.name === "string") {
        if (groupNames.has(group.name)) {
          push(
            issues,
            `/categories/${ci}/groups/${gi}/name`,
            "同じカテゴリ内でグループ名が重複しています",
          );
        }
        groupNames.add(group.name);
      }
      if (!Array.isArray(group.tasks)) continue;
      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti];
        if (!task || !isUuid(task.id)) continue;
        const taskPath = `/categories/${ci}/groups/${gi}/tasks/${ti}`;
        if (
          isIsoDateString(task.start) &&
          isIsoDateString(task.end) &&
          task.end <= task.start
        ) {
          push(issues, `${taskPath}/end`, "終了日は開始日より後である必要があります");
        }
        if (seenTaskIds.has(task.id)) {
          push(issues, `${taskPath}/id`, "タスク ID が重複しています");
        }
        seenTaskIds.add(task.id);
        if (milestoneIds.has(task.id)) {
          push(
            issues,
            `${taskPath}/id`,
            "タスク ID がマイルストン ID と重複しています",
          );
        }
        if (task.milestoneId != null && !milestoneIds.has(task.milestoneId)) {
          push(issues, `${taskPath}/milestoneId`, "存在しないマイルストン ID です");
        }
        if (Array.isArray(task.predecessors)) {
          const predSeen = new Set();
          for (let pi = 0; pi < task.predecessors.length; pi += 1) {
            const predId = task.predecessors[pi];
            if (predId === task.id) {
              push(
                issues,
                `${taskPath}/predecessors/${pi}`,
                "自分自身を先行に指定できません",
              );
            }
            if (predSeen.has(predId)) {
              push(issues, `${taskPath}/predecessors/${pi}`, "先行 ID が重複しています");
            }
            predSeen.add(predId);
            if (!allTaskIds.has(predId)) {
              push(
                issues,
                `${taskPath}/predecessors/${pi}`,
                "存在しないタスク ID です",
              );
            }
          }
        }
      }
    }
  }
}

function validateDocument(doc) {
  const issues = [];
  validateStructure(doc, issues);
  if (issues.length === 0) {
    validateSemantics(doc, issues);
  }
  return issues;
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node validate-schedule.mjs <schedule.json>");
  process.exit(2);
}

let doc;
try {
  doc = JSON.parse(readFileSync(resolve(file), "utf8"));
} catch (error) {
  console.error(`読み込みに失敗しました: ${error.message}`);
  process.exit(1);
}

const errors = validateDocument(doc);
if (errors.length > 0) {
  for (const issue of errors) {
    console.error(`${issue.path}: ${issue.message}`);
  }
  process.exit(1);
}

console.log("OK");
