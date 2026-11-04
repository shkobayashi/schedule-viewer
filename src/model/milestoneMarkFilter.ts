import type { Milestone } from "./types";

export function milestoneMarkFilterLabel(milestone: Milestone): string {
  return `${milestone.name}（${milestone.date}）`;
}

export function filterMilestoneMarksByQuery(
  milestones: readonly Milestone[],
  query: string,
): Milestone[] {
  const q = query.trim();
  if (!q) return [...milestones];
  return milestones.filter(
    (milestone) => milestone.name.includes(q) || milestone.date.includes(q),
  );
}
