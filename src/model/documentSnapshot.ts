import { cloneOutlineRoot } from "./hierarchy";
import { cloneConnections } from "./connections";
import { cloneCategories } from "./tasks";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  OutlineRoot,
  ScheduleLevelDef,
  TaskConnection,
} from "./types";

export type DocumentSnapshot = {
  title: string;
  categories: Category[];
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
  connections?: TaskConnection[];
  levels?: ScheduleLevelDef[];
  outline?: OutlineRoot;
};

export function cloneSnapshot(snapshot: DocumentSnapshot): DocumentSnapshot {
  return {
    title: snapshot.title,
    categories: cloneCategories(snapshot.categories),
    milestoneGroups: snapshot.milestoneGroups.map((group) => ({ ...group })),
    milestones: snapshot.milestones.map((milestone) => ({ ...milestone })),
    connections: cloneConnections(snapshot.connections),
    levels: snapshot.levels?.map((level) => ({ ...level })),
    outline:
      snapshot.outline != null ? cloneOutlineRoot(snapshot.outline) : undefined,
  };
}
