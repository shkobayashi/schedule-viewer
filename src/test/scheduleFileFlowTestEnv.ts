import type { RefObject } from "react";
import { documentToJsonString } from "../model/serialize";
import type { ScheduleDocument } from "../model/types";
import { EXTERNAL_RELOAD_POLL_MS } from "../hooks/scheduleFile/constants";
import {
  createScheduleFileFlowInvoke,
  FLOW_SCHEDULE_PATH,
  type ScheduleFileFlowInvoke,
} from "./scheduleFileFlowInvoke";
import type { ScheduleFileFlowHandle } from "./scheduleFileFlowHarness";
import { loadRegressionSchedule } from "./searchErrorKeysFixtures";

export const TASK_SURVEY = "e1000001-0000-4000-8000-000000000001";
export const TASK_DESIGN = "e1000001-0000-4000-8000-000000000002";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

export function installDomFlowPrereqs(): void {
  globalThis.ResizeObserver = ResizeObserverStub;
}

export function seedRegressionCatalogs(readRegressionText: (name: string) => string): void {
  localStorage.clear();
  localStorage.setItem(
    "schedule-viewer/members/catalogs",
    JSON.stringify({ members: readRegressionText("members.json") }),
  );
  localStorage.setItem("schedule-viewer/members/selected", "members");
  localStorage.setItem(
    "schedule-viewer/statuses/catalogs",
    JSON.stringify({ statuses: readRegressionText("statuses.json") }),
  );
  localStorage.setItem("schedule-viewer/statuses/selected", "statuses");
  localStorage.setItem("schedule-viewer/statuses/builtin-seeded", "1");
  localStorage.setItem(
    "schedule-viewer/colors/catalogs",
    JSON.stringify({ colors: readRegressionText("colors.json") }),
  );
  localStorage.setItem("schedule-viewer/colors/selected", "colors");
  localStorage.setItem(
    "schedule-viewer/field-extensions/catalogs",
    JSON.stringify({ sample: readRegressionText("fields.json") }),
  );
  localStorage.setItem(
    "schedule-viewer/field-extensions/selected",
    JSON.stringify(["sample"]),
  );
}

export function cloneWithTaskStart(
  source: ScheduleDocument,
  taskId: string,
  start: string,
): ScheduleDocument {
  const next = structuredClone(source);
  for (const category of next.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        if (task.id === taskId) {
          task.start = start;
        }
      }
    }
  }
  return next;
}

export function cloneWithTaskEnd(
  source: ScheduleDocument,
  taskId: string,
  end: string,
): ScheduleDocument {
  const next = structuredClone(source);
  for (const category of next.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        if (task.id === taskId) {
          task.end = end;
        }
      }
    }
  }
  return next;
}

export function cloneWithOutlineTaskEnd(
  source: ScheduleDocument,
  taskId: string,
  end: string,
): ScheduleDocument {
  const next = structuredClone(source);
  const outline = next.outline;
  if (outline == null) return next;
  const walk = (nodes: NonNullable<ScheduleDocument["outline"]>): boolean => {
    for (const node of nodes) {
      if (node.id === taskId && "end" in node) {
        node.end = end;
        return true;
      }
      if ("children" in node && node.children != null && walk(node.children)) {
        return true;
      }
    }
    return false;
  };
  walk(outline);
  return next;
}

export function cloneWithTaskName(
  source: ScheduleDocument,
  taskId: string,
  name: string,
): ScheduleDocument {
  const next = structuredClone(source);
  for (const category of next.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        if (task.id === taskId) {
          task.name = name;
        }
      }
    }
  }
  return next;
}

export function draftWrapper(
  document: ScheduleDocument,
  baselineJson: string,
): string {
  return JSON.stringify({
    path: FLOW_SCHEDULE_PATH,
    baselineJson,
    documentJson: documentToJsonString(document),
  });
}

export function createFlowEnv(document = loadRegressionSchedule("smoke.schedule.json")) {
  return createScheduleFileFlowInvoke(document);
}

export async function advanceOnePoll() {
  const { vi } = await import("vitest");
  const { act } = await import("@testing-library/react");
  if (!vi.isFakeTimers()) {
    vi.useFakeTimers();
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(EXTERNAL_RELOAD_POLL_MS);
  });
}

export function pollJson(doc: ScheduleDocument) {
  return { contents: documentToJsonString(doc) };
}

export type FlowHarnessRef = RefObject<ScheduleFileFlowHandle | null>;

export type { ScheduleFileFlowInvoke, ScheduleFileFlowHandle, FLOW_SCHEDULE_PATH };
