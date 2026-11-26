import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isoDate, parseDate } from "../model/dates";
import { lightningDate } from "../model/timeline";
import { SAMPLE_TASK_IDS } from "./ids";
import {
  SAMPLE_REFERENCE_TODAY,
  anchorSampleSchedule,
} from "./anchorSample";
import {
  sampleCategories,
  sampleMilestones,
} from "./schedule";

function taskById(categories: typeof sampleCategories, id: string) {
  for (const category of categories) {
    for (const group of category.groups) {
      const task = group.tasks.find((t) => t.id === id);
      if (task) return task;
    }
  }
  return null;
}

function lightningKind(
  task: { start: string; end: string; status: string },
  today: string,
): "today" | "ahead" | "behind" {
  const point = lightningDate(task, today);
  if (point === today) return "today";
  if (point === task.start) return "ahead";
  if (point === task.end) return "behind";
  return "today";
}

describe("anchorSampleSchedule", () => {
  it("keeps template progress on the reference day", () => {
    const { categories } = anchorSampleSchedule(
      sampleCategories,
      sampleMilestones,
      SAMPLE_REFERENCE_TODAY,
    );
    const t02 = taskById(categories, SAMPLE_TASK_IDS.t02);
    const t04 = taskById(categories, SAMPLE_TASK_IDS.t04);
    expect(t02?.progress).toBe(60);
    expect(t04?.progress).toBe(30);
  });

  it("preserves one ahead and one behind lightning on varied open days", () => {
    for (const openToday of [
      "2026-03-02",
      "2026-10-10",
      "2026-11-05",
      "2028-06-15",
    ]) {
      const { categories } = anchorSampleSchedule(
        sampleCategories,
        sampleMilestones,
        openToday,
      );
      const ahead = taskById(categories, SAMPLE_TASK_IDS.t05);
      const behind = taskById(categories, SAMPLE_TASK_IDS.t04);
      expect(ahead).not.toBeNull();
      expect(behind).not.toBeNull();
      expect(ahead!.status).toBe("not-started");
      expect(behind!.status).toBe("in-progress");
      expect(lightningKind(ahead!, openToday)).toBe("ahead");
      expect(lightningKind(behind!, openToday)).toBe("behind");
      for (const category of categories) {
        for (const group of category.groups) {
          for (const task of group.tasks) {
            expect(task.start <= task.end).toBe(true);
          }
        }
      }
    }
  });

  it("shifts milestones with tasks by the same offset", () => {
    const openToday = "2027-01-15";
    const delta = daysBetween(
      parseDate(SAMPLE_REFERENCE_TODAY),
      parseDate(openToday),
    );
    const { milestones, categories } = anchorSampleSchedule(
      sampleCategories,
      sampleMilestones,
      openToday,
    );
    const t01 = taskById(categories, SAMPLE_TASK_IDS.t01);
    const templateT01Start = "2026-09-14";
    const templateM0 = sampleMilestones[0]!.date;
    expect(t01?.start).toBe(
      isoDate(addDays(parseDate(templateT01Start), delta)),
    );
    expect(milestones[0]?.date).toBe(
      isoDate(addDays(parseDate(templateM0), delta)),
    );
  });
});
