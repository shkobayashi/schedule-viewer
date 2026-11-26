import {
  cloneOutlineRoot,
  isOutlineBranch,
  tasksUnderOutlineBranch,
} from "./hierarchy";
import type {
  OutlineBranch,
  OutlineChild,
  OutlineRoot,
  ScheduleId,
  ScheduleLevelDef,
} from "./types";

export type OutlineCrudResult = {
  outline: OutlineRoot;
  error: string | null;
  changed: boolean;
};

type BranchLocation = {
  parentChildren: OutlineChild[];
  index: number;
  levelIndex: number;
  branch: OutlineBranch;
};

export function findOutlineBranchLevelIndex(
  outline: OutlineRoot,
  branchId: ScheduleId,
): number | null {
  let found: number | null = null;
  const walk = (nodes: OutlineChild[], levelIndex: number): boolean => {
    for (const node of nodes) {
      if (!isOutlineBranch(node)) continue;
      if (node.id === branchId) {
        found = levelIndex;
        return true;
      }
      if (walk(node.children, levelIndex + 1)) return true;
    }
    return false;
  };
  walk(outline, 0);
  return found;
}

function locateOutlineBranch(
  nodes: OutlineChild[],
  branchId: ScheduleId,
  levelIndex: number,
): BranchLocation | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!isOutlineBranch(node)) continue;
    if (node.id === branchId) {
      return { parentChildren: nodes, index, levelIndex, branch: node };
    }
    const nested = locateOutlineBranch(node.children, branchId, levelIndex + 1);
    if (nested) return nested;
  }
  return null;
}

function countBranchSiblings(children: OutlineChild[]): number {
  return children.filter(isOutlineBranch).length;
}

function siblingBranchNames(
  children: OutlineChild[],
  excludeId?: ScheduleId,
): Set<string> {
  const names = new Set<string>();
  for (const child of children) {
    if (!isOutlineBranch(child)) continue;
    if (child.id === excludeId) continue;
    names.add(child.name);
  }
  return names;
}

function validateNewBranchName(
  rawName: string,
  siblings: OutlineChild[],
): { name: string; error: string | null } {
  const name = rawName.trim();
  if (!name) {
    return { name: "", error: "名前を入力してください" };
  }
  if (siblingBranchNames(siblings).has(name)) {
    return { name, error: "同じ階層内で名前が重複しています" };
  }
  return { name, error: null };
}

export function taskParentLevelIndex(levelCount: number): number {
  return Math.max(0, levelCount - 2);
}

/** 追加した枝の下を、タスクの一つ上まで定義名でつなぐ。 */
export function buildOutlineBranchWithDescendants(
  levelIndex: number,
  levelCount: number,
  levels: ScheduleLevelDef[],
  branchId: ScheduleId,
  branchName: string,
  allocateId: () => ScheduleId,
): OutlineBranch {
  const taskParentIndex = taskParentLevelIndex(levelCount);
  if (levelIndex >= taskParentIndex) {
    return { id: branchId, name: branchName, children: [] };
  }
  const childLevelIndex = levelIndex + 1;
  const childName = levels[childLevelIndex]?.name ?? "グループ";
  const childId = allocateId();
  const child = buildOutlineBranchWithDescendants(
    childLevelIndex,
    levelCount,
    levels,
    childId,
    childName,
    allocateId,
  );
  return { id: branchId, name: branchName, children: [child] };
}

function insertSiblingAfterInTree(
  nodes: OutlineChild[],
  afterBranchId: ScheduleId,
  branch: OutlineBranch,
): OutlineChild[] | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (isOutlineBranch(node) && node.id === afterBranchId) {
      const next = [...nodes];
      next.splice(index + 1, 0, branch);
      return next;
    }
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!isOutlineBranch(node)) continue;
    const nested = insertSiblingAfterInTree(node.children, afterBranchId, branch);
    if (nested) {
      const next = [...nodes];
      next[index] = { ...node, children: nested };
      return next;
    }
  }
  return null;
}

export function appendOutlineTopLevel(
  outline: OutlineRoot,
  levelCount: number,
  levels: ScheduleLevelDef[],
  rawName: string,
  newBranchId: ScheduleId,
  allocateId: () => ScheduleId,
): OutlineCrudResult {
  const { name, error } = validateNewBranchName(rawName, outline);
  if (error) {
    return { outline, error, changed: false };
  }
  const branch = buildOutlineBranchWithDescendants(
    0,
    levelCount,
    levels,
    newBranchId,
    name,
    allocateId,
  );
  return {
    outline: [...cloneOutlineRoot(outline), branch],
    error: null,
    changed: true,
  };
}

export function insertOutlineSiblingAfter(
  outline: OutlineRoot,
  afterBranchId: ScheduleId,
  levelCount: number,
  levels: ScheduleLevelDef[],
  rawName: string,
  newBranchId: ScheduleId,
  allocateId: () => ScheduleId,
): OutlineCrudResult {
  const located = locateOutlineBranch(outline, afterBranchId, 0);
  if (!located) {
    return { outline, error: "階層が見つかりません", changed: false };
  }
  const { name, error } = validateNewBranchName(rawName, located.parentChildren);
  if (error) {
    return { outline, error, changed: false };
  }
  const branch = buildOutlineBranchWithDescendants(
    located.levelIndex,
    levelCount,
    levels,
    newBranchId,
    name,
    allocateId,
  );
  const next = insertSiblingAfterInTree(
    cloneOutlineRoot(outline),
    afterBranchId,
    branch,
  );
  if (!next) {
    return { outline, error: "階層が見つかりません", changed: false };
  }
  return {
    outline: next as OutlineRoot,
    error: null,
    changed: true,
  };
}

function appendChildToBranch(
  outline: OutlineRoot,
  parentId: ScheduleId,
  child: OutlineBranch,
): OutlineRoot {
  const cloned = cloneOutlineRoot(outline);
  const walk = (nodes: OutlineChild[]): OutlineChild[] =>
    nodes.map((node) => {
      if (!isOutlineBranch(node)) return node;
      if (node.id === parentId) {
        return { ...node, children: [...node.children, child] };
      }
      return { ...node, children: walk(node.children) };
    });
  return walk(cloned) as OutlineRoot;
}

export function appendOutlineChildBranch(
  outline: OutlineRoot,
  parentBranchId: ScheduleId,
  levelCount: number,
  levels: ScheduleLevelDef[],
  rawName: string,
  newBranchId: ScheduleId,
  allocateId: () => ScheduleId,
): OutlineCrudResult {
  const located = locateOutlineBranch(outline, parentBranchId, 0);
  if (!located) {
    return { outline, error: "階層が見つかりません", changed: false };
  }
  const childLevelIndex = located.levelIndex + 1;
  const taskParentIndex = taskParentLevelIndex(levelCount);
  if (childLevelIndex > taskParentIndex) {
    return { outline, error: "追加できませんでした", changed: false };
  }
  const { name, error } = validateNewBranchName(rawName, located.branch.children);
  if (error) {
    return { outline, error, changed: false };
  }
  const branch = buildOutlineBranchWithDescendants(
    childLevelIndex,
    levelCount,
    levels,
    newBranchId,
    name,
    allocateId,
  );
  return {
    outline: appendChildToBranch(outline, parentBranchId, branch),
    error: null,
    changed: true,
  };
}

export function renameOutlineBranch(
  outline: OutlineRoot,
  branchId: ScheduleId,
  rawName: string,
): OutlineCrudResult {
  const located = locateOutlineBranch(outline, branchId, 0);
  if (!located) {
    return { outline, error: "階層が見つかりません", changed: false };
  }
  const name = rawName.trim();
  if (!name || name === located.branch.name) {
    return { outline, error: null, changed: false };
  }
  const siblings = siblingBranchNames(located.parentChildren, branchId);
  if (siblings.has(name)) {
    return { outline, error: "同じ階層内で名前が重複しています", changed: false };
  }
  const cloned = cloneOutlineRoot(outline);
  const walk = (nodes: OutlineChild[]): OutlineChild[] =>
    nodes.map((node) => {
      if (!isOutlineBranch(node)) return node;
      if (node.id === branchId) {
        return { ...node, name };
      }
      return { ...node, children: walk(node.children) };
    });
  return { outline: walk(cloned) as OutlineRoot, error: null, changed: true };
}

export function canDeleteOutlineBranch(
  outline: OutlineRoot,
  branchId: ScheduleId,
): boolean {
  const located = locateOutlineBranch(outline, branchId, 0);
  if (!located) return false;
  if (countBranchSiblings(located.parentChildren) <= 1) return false;
  return tasksUnderOutlineBranch(located.branch).length === 0;
}

export function removeOutlineBranch(
  outline: OutlineRoot,
  branchId: ScheduleId,
): OutlineRoot {
  if (!canDeleteOutlineBranch(outline, branchId)) return outline;
  const filter = (nodes: OutlineChild[]): OutlineChild[] => {
    const next: OutlineChild[] = [];
    for (const node of nodes) {
      if (isOutlineBranch(node)) {
        if (node.id === branchId) continue;
        next.push({ ...node, children: filter(node.children) });
      } else {
        next.push(node);
      }
    }
    return next;
  };
  return filter(cloneOutlineRoot(outline)) as OutlineRoot;
}

export function findOutlineBranchName(
  outline: OutlineRoot,
  branchId: ScheduleId,
): string | null {
  const located = locateOutlineBranch(outline, branchId, 0);
  return located?.branch.name ?? null;
}

export type OutlineBranchSelectOption = {
  id: ScheduleId;
  label: string;
};

type BranchAtLevel = {
  id: ScheduleId;
  name: string;
  pathNames: string[];
};

/** 指定した段の見出し枝を文書順で返す。 */
export function outlineBranchesAtLevelIndex(
  outline: OutlineRoot,
  levelIndex: number,
): BranchAtLevel[] {
  const result: BranchAtLevel[] = [];
  const walk = (nodes: OutlineChild[], depth: number, pathNames: string[]) => {
    for (const node of nodes) {
      if (!isOutlineBranch(node)) continue;
      const path = [...pathNames, node.name];
      if (depth === levelIndex) {
        result.push({ id: node.id, name: node.name, pathNames: path });
      }
      walk(node.children, depth + 1, path);
    }
  };
  walk(outline, 0, []);
  return result;
}

/** 追加先の選択肢。同じ段で名前が重なる枝だけ経路を付ける。 */
export function outlineBranchSelectOptions(
  outline: OutlineRoot,
  levelIndex: number,
): OutlineBranchSelectOption[] {
  const branches = outlineBranchesAtLevelIndex(outline, levelIndex);
  const nameCounts = new Map<string, number>();
  for (const branch of branches) {
    nameCounts.set(branch.name, (nameCounts.get(branch.name) ?? 0) + 1);
  }
  return branches.map((branch) => ({
    id: branch.id,
    label:
      (nameCounts.get(branch.name) ?? 0) > 1
        ? branch.pathNames.join(" / ")
        : branch.name,
  }));
}

/** 見出しとして足せる段のインデックス（タスクの段を除く）。 */
export function headingLevelIndices(levelCount: number): number[] {
  const last = taskParentLevelIndex(levelCount);
  return Array.from({ length: last + 1 }, (_, index) => index);
}

/** ツールバーから選んだ段と親へ見出しを足す。最上段は一覧の末尾。 */
export function appendOutlineHeadingAtLevel(
  outline: OutlineRoot,
  levelCount: number,
  levels: ScheduleLevelDef[],
  levelIndex: number,
  parentBranchId: ScheduleId | null,
  rawName: string,
  newBranchId: ScheduleId,
  allocateId: () => ScheduleId,
): OutlineCrudResult {
  const taskParentIndex = taskParentLevelIndex(levelCount);
  if (levelIndex < 0 || levelIndex > taskParentIndex) {
    return { outline, error: "追加できませんでした", changed: false };
  }
  if (levelIndex === 0) {
    return appendOutlineTopLevel(
      outline,
      levelCount,
      levels,
      rawName,
      newBranchId,
      allocateId,
    );
  }
  if (parentBranchId == null) {
    return { outline, error: "追加先を選んでください", changed: false };
  }
  const parentLevel = findOutlineBranchLevelIndex(outline, parentBranchId);
  if (parentLevel !== levelIndex - 1) {
    return { outline, error: "追加先を選んでください", changed: false };
  }
  return appendOutlineChildBranch(
    outline,
    parentBranchId,
    levelCount,
    levels,
    rawName,
    newBranchId,
    allocateId,
  );
}
