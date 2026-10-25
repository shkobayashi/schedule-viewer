import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BUILTIN_STATUS_ITEMS,
  BUILTIN_STATUSES,
  type StatusItem,
} from "../model/statusCatalog";
import {
  deleteStatusCatalog,
  importStatusCatalog,
  loadAppStatusesSettings,
  readStatusCatalog,
  seedBuiltinStatusCatalogOnce,
  setSelectedStatusCatalog,
  type AppStatusesSettings,
} from "../model/statusAppData";
import { bumpSharedSettingsRevision } from "../model/sharedSettingsRevision";

export const BUILTIN_STATUS_CATALOG_ID = "standard";

export function builtinStatusesJson(): string {
  return `${JSON.stringify(BUILTIN_STATUSES, null, 2)}\n`;
}

/** 選んだ一覧の項目。選んでいないときと読めないときは、組み込みの三件。 */
export function useStatusCatalog() {
  const [settings, setSettings] = useState<AppStatusesSettings>({
    selectedCatalogId: null,
    catalogs: [],
  });
  const [items, setItems] = useState<readonly StatusItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadAppStatusesSettings();
      setSettings(next);
      if (next.selectedCatalogId) {
        const doc = await readStatusCatalog(next.selectedCatalogId);
        setItems(doc?.statuses ?? null);
      } else {
        setItems(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ステータスの一覧を読み込めませんでした。",
      );
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await seedBuiltinStatusCatalogOnce(
          BUILTIN_STATUS_CATALOG_ID,
          builtinStatusesJson(),
        );
      } catch {
        // 初回の書き込みに失敗しても、組み込みの三件で動く。
      }
      await refresh();
    })();
  }, [refresh]);

  const selectCatalog = useCallback(
    async (catalogId: string | null) => {
      await setSelectedStatusCatalog(catalogId);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const importCatalog = useCallback(
    async (catalogId: string, contents: string, overwrite: boolean) => {
      await importStatusCatalog(catalogId, contents, overwrite);
      await setSelectedStatusCatalog(catalogId);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const saveCatalog = useCallback(
    async (catalogId: string, contents: string, overwrite: boolean) => {
      await importStatusCatalog(catalogId, contents, overwrite);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const removeCatalog = useCallback(
    async (catalogId: string) => {
      await deleteStatusCatalog(catalogId);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const statuses = useMemo<readonly StatusItem[]>(
    () => items ?? BUILTIN_STATUS_ITEMS,
    [items],
  );

  const selectedCatalogLabel = useMemo(() => {
    if (!settings.selectedCatalogId) return null;
    return (
      settings.catalogs.find((c) => c.id === settings.selectedCatalogId)?.label ??
      settings.selectedCatalogId
    );
  }, [settings]);

  return {
    settings,
    statuses,
    selectedCatalogLabel,
    loading,
    error,
    refresh,
    selectCatalog,
    importCatalog,
    saveCatalog,
    removeCatalog,
  };
}
