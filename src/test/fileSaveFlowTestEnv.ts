import { documentToJsonString } from "../model/serialize";
import type { ScheduleDocument } from "../model/types";
import {
  createFileSaveFlowInvoke,
  FLOW_SCHEDULE_PATH,
  LEVELS_3_PATH,
  SMOKE_PATH,
  type FileSaveFlowInvoke,
} from "./fileSaveFlowInvoke";
import type { FileSaveFlowHandle } from "./fileSaveFlowHarness";
import {
  loadExampleSchedule,
  loadRegressionSchedule,
  readRegressionText,
} from "./searchErrorKeysFixtures";

export const TASK_DESIGN = "e1000001-0000-4000-8000-000000000002";

export type QuitEventBus = {
  emit: (event: "application-quit-requested" | "application-quit-cancelled") => void;
};

export type CloseRequestBus = {
  requestClose: () => Promise<void>;
};

export function installDomFlowPrereqs(): void {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub;
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoViewStub() {};
  }
}

export function seedRegressionCatalogs(
  readText: (name: string) => string = readRegressionText,
): void {
  localStorage.clear();
  localStorage.setItem(
    "schedule-viewer/members/catalogs",
    JSON.stringify({ members: readText("members.json") }),
  );
  localStorage.setItem("schedule-viewer/members/selected", "members");
  localStorage.setItem(
    "schedule-viewer/statuses/catalogs",
    JSON.stringify({ statuses: readText("statuses.json") }),
  );
  localStorage.setItem("schedule-viewer/statuses/selected", "statuses");
  localStorage.setItem("schedule-viewer/statuses/builtin-seeded", "1");
  localStorage.setItem(
    "schedule-viewer/colors/catalogs",
    JSON.stringify({ colors: readText("colors.json") }),
  );
  localStorage.setItem("schedule-viewer/colors/selected", "colors");
  localStorage.setItem(
    "schedule-viewer/field-extensions/catalogs",
    JSON.stringify({ sample: readText("fields.json") }),
  );
  localStorage.setItem(
    "schedule-viewer/field-extensions/selected",
    JSON.stringify(["sample"]),
  );
}

export function smokeDocument(): ScheduleDocument {
  return loadRegressionSchedule("smoke.schedule.json");
}

export function levels3Document(): ScheduleDocument {
  return loadExampleSchedule("hierarchy/levels-3.schedule.json");
}

export function levels3Text(): string {
  return documentToJsonString(levels3Document());
}

export function fullScheduleText(): string {
  return documentToJsonString(loadRegressionSchedule("full.schedule.json"));
}

export function createSaveFlowEnv(
  document: ScheduleDocument = smokeDocument(),
): FileSaveFlowInvoke {
  const flow = createFileSaveFlowInvoke(document);
  const smokeText = documentToJsonString(document);
  flow.setDisk(SMOKE_PATH, smokeText);
  flow.setDisk(FLOW_SCHEDULE_PATH, smokeText);
  return flow;
}

export {
  FLOW_SCHEDULE_PATH,
  LEVELS_3_PATH,
  SMOKE_PATH,
  type FileSaveFlowInvoke,
  type FileSaveFlowHandle,
};
