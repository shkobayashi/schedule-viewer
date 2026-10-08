import type { ErrorObject } from "ajv/dist/2020.js";
import type { ValidationIssue } from "./scheduleSemantics";

const AJV_JA: Record<string, string> = {
  "must be integer": "整数である必要があります",
  "must be string": "文字列である必要があります",
  "must be number": "数値である必要があります",
  "must be object": "オブジェクトである必要があります",
  "must be array": "配列である必要があります",
  "must NOT have fewer than 1 items": "1 件以上必要です",
  "must NOT have additional properties": "未知のプロパティは許可されていません",
  'must match format "date"': "日付の形式（YYYY-MM-DD）である必要があります",
  'must match format "uuid"': "UUID の形式である必要があります",
  "must be >= 0": "0 以上である必要があります",
  "must be <= 100": "100 以下である必要があります",
};

const FIELD_LABELS: Record<string, string> = {
  name: "名前",
  start: "開始日",
  end: "終了日",
  progress: "進捗率",
  confidence: "確度",
  assigneeId: "担当者",
  status: "状態",
  predecessors: "先行タスク",
  milestoneId: "マイルストン",
  tags: "タグ",
  date: "日付",
  title: "タイトル",
  schemaVersion: "スキーマバージョン",
  id: "ID",
  milestones: "マイルストン",
  categories: "カテゴリ",
  groups: "グループ",
  tasks: "タスク",
};

function fieldLabel(name: string): string {
  return FIELD_LABELS[name] ?? name;
}

function localizeAjvMessage(message: string | undefined): string {
  if (!message) return "スキーマ違反";
  return AJV_JA[message] ?? message;
}

function localizeAjvError(error: ErrorObject): string {
  const params = error.params as Record<string, unknown>;
  switch (error.keyword) {
    case "type":
      return localizeAjvMessage(
        typeof params.type === "string" ? `must be ${params.type}` : error.message,
      );
    case "required":
      return `必須項目「${fieldLabel(String(params.missingProperty ?? ""))}」がありません`;
    case "const":
      return `${String(params.allowedValue ?? "")} である必要があります`;
    case "enum":
      return "許可された値のいずれかである必要があります";
    case "minLength":
      return `${String(params.limit ?? 1)} 文字以上必要です`;
    case "minimum":
      return `${String(params.limit ?? 0)} 以上である必要があります`;
    case "maximum":
      return `${String(params.limit ?? 0)} 以下である必要があります`;
    case "minItems":
      return `${String(params.limit ?? 1)} 件以上必要です`;
    case "format":
      return localizeAjvMessage(
        typeof params.format === "string"
          ? `must match format "${params.format}"`
          : error.message,
      );
    case "additionalProperties":
      return "未知のプロパティは許可されていません";
    default:
      return localizeAjvMessage(error.message);
  }
}

function readAtPath(data: unknown, segments: string[]): unknown {
  let current: unknown = data;
  for (const segment of segments) {
    if (current == null || typeof current !== "object") return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function humanizeInstancePath(data: unknown, instancePath: string): string {
  if (!instancePath || instancePath === "/") return "文書";
  const segments = instancePath.split("/").filter(Boolean);
  const parts: string[] = [];

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]!;
    if (segment === "categories" && segments[i + 1] !== undefined) {
      const cat = readAtPath(data, segments.slice(0, i + 2));
      const name =
        cat && typeof cat === "object" && "name" in cat
          ? String((cat as { name: unknown }).name)
          : `カテゴリ ${segments[i + 1]}`;
      parts.push(`カテゴリ「${name}」`);
      i += 1;
      continue;
    }
    if (segment === "groups" && segments[i + 1] !== undefined) {
      const group = readAtPath(data, segments.slice(0, i + 2));
      const name =
        group && typeof group === "object" && "name" in group
          ? String((group as { name: unknown }).name)
          : `グループ ${segments[i + 1]}`;
      parts.push(`グループ「${name}」`);
      i += 1;
      continue;
    }
    if (segment === "tasks" && segments[i + 1] !== undefined) {
      const task = readAtPath(data, segments.slice(0, i + 2));
      const name =
        task && typeof task === "object" && "name" in task
          ? String((task as { name: unknown }).name)
          : `タスク ${segments[i + 1]}`;
      parts.push(`タスク「${name}」`);
      i += 1;
      continue;
    }
    if (segment === "milestones" && segments[i + 1] !== undefined) {
      const milestone = readAtPath(data, segments.slice(0, i + 2));
      const name =
        milestone && typeof milestone === "object" && "name" in milestone
          ? String((milestone as { name: unknown }).name)
          : `マイルストン ${segments[i + 1]}`;
      parts.push(`マイルストン「${name}」`);
      i += 1;
      continue;
    }
    parts.push(fieldLabel(segment));
  }

  return parts.join(" / ");
}

export function formatAjvErrors(
  data: unknown,
  errors: ErrorObject[] | null | undefined,
): ValidationIssue[] {
  if (!errors) return [];
  return errors.map((error) => ({
    path: humanizeInstancePath(data, error.instancePath || "/"),
    message: localizeAjvError(error),
  }));
}

export function formatValidationErrors(errors: ValidationIssue[]): string {
  return errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}
