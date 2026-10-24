import { useCallback, useState } from "react";
import type { WorkspaceWindowBinding } from "../model/workspaceTypes";
import { loadWorkspaceBinding } from "../model/workspaceLoad";

export function useWorkspaceBinding() {
  const [binding, setBinding] = useState<WorkspaceWindowBinding | null>(null);

  const clearWorkspaceBinding = useCallback(() => {
    setBinding(null);
  }, []);

  const applyWorkspaceFile = useCallback(
    async (workspacePath: string, workspaceText: string) => {
      const loaded = await loadWorkspaceBinding(workspacePath, workspaceText);
      if (!loaded.ok) {
        return loaded;
      }
      setBinding(loaded.binding);
      return loaded;
    },
    [],
  );

  const reloadWorkspaceBinding = useCallback(async () => {
    if (!binding) return { ok: false as const, message: "設定ファイルがありません。" };
    const { readJsonFileLimitedViaTauri } = await import("../model/workspaceLoad");
    const text = await readJsonFileLimitedViaTauri(
      binding.workspacePath,
      64 * 1024,
    );
    return applyWorkspaceFile(binding.workspacePath, text);
  }, [applyWorkspaceFile, binding]);

  return {
    workspaceBinding: binding,
    setWorkspaceBinding: setBinding,
    clearWorkspaceBinding,
    applyWorkspaceFile,
    reloadWorkspaceBinding,
  };
}
