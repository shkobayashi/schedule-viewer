import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColorItem } from "../model/colorCatalog";
import {
  deleteColorCatalog,
  importColorCatalog,
  loadAppColorsSettings,
  readColorCatalog,
  setSelectedColorCatalog,
  type AppColorsSettings,
} from "../model/colorAppData";
import { bumpSharedSettingsRevision } from "../model/sharedSettingsRevision";

/** 選んだ一覧の項目。未選択のときは null。 */
export function useColorCatalog() {
  const [settings, setSettings] = useState<AppColorsSettings>({
    selectedCatalogId: null,
    catalogs: [],
  });
  const [items, setItems] = useState<readonly ColorItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadAppColorsSettings();
      setSettings(next);
      if (next.selectedCatalogId) {
        const doc = await readColorCatalog(next.selectedCatalogId);
        setItems(doc?.colors ?? null);
      } else {
        setItems(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "色の一覧を読み込めませんでした。",
      );
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectCatalog = useCallback(
    async (catalogId: string | null) => {
      await setSelectedColorCatalog(catalogId);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const importCatalog = useCallback(
    async (catalogId: string, contents: string, overwrite: boolean) => {
      await importColorCatalog(catalogId, contents, overwrite);
      await setSelectedColorCatalog(catalogId);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const saveCatalog = useCallback(
    async (catalogId: string, contents: string, overwrite: boolean) => {
      await importColorCatalog(catalogId, contents, overwrite);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const removeCatalog = useCallback(
    async (catalogId: string) => {
      await deleteColorCatalog(catalogId);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
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
    items,
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
