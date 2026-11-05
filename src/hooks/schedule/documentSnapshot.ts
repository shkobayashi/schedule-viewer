import { cloneCategories } from "../../model/tasks";
import { cloneConnections } from "../../model/connections";
import { cloneOutlineRoot } from "../../model/hierarchy";
import type { DocumentSnapshot } from "../../model/history";
import { SCHEDULE_SCHEMA_VERSION } from "../../model/types";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  ScheduleDocument,
} from "../../model/types";

export function snapshotFromDocument(doc: ScheduleDocument): DocumentSnapshot {
  return {
    title: doc.title,
    categories: cloneCategories(doc.categories ?? []),
    milestoneGroups: doc.milestoneGroups.map((group) => ({ ...group })),
    milestones: doc.milestones.map((milestone) => ({ ...milestone })),
    connections: cloneConnections(doc.connections),
    levels: doc.levels?.map((level) => ({ ...level })),
    outline:
      doc.outline != null ? cloneOutlineRoot(doc.outline) : undefined,
  };
}

export function initialDocumentSnapshot(
  title: string,
  categories: Category[],
  milestoneGroups: MilestoneGroup[],
  milestones: Milestone[],
): DocumentSnapshot {
  return snapshotFromDocument({
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    categories,
    milestoneGroups,
    milestones,
  });
}
