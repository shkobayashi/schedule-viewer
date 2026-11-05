import { isTaskNode } from "./hierarchy";
import type { OutlineChild, OutlineRoot, Task } from "./types";

function mapOutlineChildForAll(
  node: OutlineChild,
  update: (task: Task) => Task,
): OutlineChild {
  if (isTaskNode(node)) return update(node);
  return {
    ...node,
    children: node.children.map((child) => mapOutlineChildForAll(child, update)),
  };
}

export function mapAllTasksInOutline(
  outline: OutlineRoot,
  update: (task: Task) => Task,
): OutlineRoot {
  return outline.map((node) => mapOutlineChildForAll(node, update));
}
