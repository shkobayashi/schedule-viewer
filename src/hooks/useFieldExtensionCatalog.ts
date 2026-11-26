import { useCallback, useEffect, useMemo, useState } from "react";
import type { FieldExtensionDocument } from "../model/fieldExtensionTypes";
import {
  deleteFieldExtensionCatalog,
  importFieldExtensionCatalog,
  parseFieldExtensionCatalogText,
  loadAppFieldExtensionsSettings,
  readFieldExtensionCatalog,
  setSelectedFieldExtensionCatalogs,
} from "../model/fieldExtensionAppData";
import { mergeExtensionFieldDefs } from "../model/fieldExtensionMerge";
import type { ScheduleFieldDef } from "../model/types";
import { bumpSharedSettingsRevision } from "../model/sharedSettingsRevision";

export function useFieldExtensionCatalog() {
  const [settings, setSettings] = useState({
    selectedCatalogIds: [] as string[],
    catalogs: [] as import("../model/fieldExtensionTypes").FieldExtensionCatalogInfo[],
  });
  const [documents, setDocuments] = useState<FieldExtensionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextSettings = await loadAppFieldExtensionsSettings();
      setSettings(nextSettings);
      const loaded: FieldExtensionDocument[] = [];
      for (const id of nextSettings.selectedCatalogIds) {
        const doc = await readFieldExtensionCatalog(id);
        if (doc != null) {
          loaded.push(doc);
        }
      }
      setDocuments(loaded);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "拡張項目の設定を読み込めませんでした。",
      );
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const importCatalog = useCallback(
    async (contents: string, overwrite: boolean) => {
      const catalogId = await importFieldExtensionCatalog(contents, overwrite);
      const nextSelected = settings.selectedCatalogIds.includes(catalogId)
        ? settings.selectedCatalogIds
        : [...settings.selectedCatalogIds, catalogId];
      await setSelectedFieldExtensionCatalogs(nextSelected);
      await refresh();
      bumpSharedSettingsRevision();
      return catalogId;
    },
    [refresh, settings.selectedCatalogIds],
  );

  const saveCatalog = useCallback(
    async (catalogId: string, contents: string): Promise<string> => {
      const document = parseFieldExtensionCatalogText(contents);
      const nextId = document.id;
      if (nextId !== catalogId) {
        if (settings.catalogs.some((catalog) => catalog.id === nextId)) {
          throw new Error("同じプラグイン ID の拡張が既にあります。");
        }
        await importFieldExtensionCatalog(contents, false);
        await deleteFieldExtensionCatalog(catalogId);
        const nextSelected = settings.selectedCatalogIds.map((id) =>
          id === catalogId ? nextId : id,
        );
        await setSelectedFieldExtensionCatalogs(nextSelected);
      } else {
        await importFieldExtensionCatalog(contents, true);
      }
      await refresh();
      bumpSharedSettingsRevision();
      return nextId;
    },
    [refresh, settings.catalogs, settings.selectedCatalogIds],
  );

  const removeCatalog = useCallback(
    async (catalogId: string) => {
      await deleteFieldExtensionCatalog(catalogId);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const setSelectedCatalogIds = useCallback(
    async (catalogIds: string[]) => {
      await setSelectedFieldExtensionCatalogs(catalogIds);
      await refresh();
      bumpSharedSettingsRevision();
    },
    [refresh],
  );

  const extensionFieldDefs = useMemo(
    (): ScheduleFieldDef[] => mergeExtensionFieldDefs(documents),
    [documents],
  );

  const selectedLabels = useMemo(() => {
    return settings.selectedCatalogIds.map((id) => {
      const catalog = settings.catalogs.find((entry) => entry.id === id);
      const doc = documents.find((entry) => entry.id === id);
      return doc?.name ?? catalog?.label ?? id;
    });
  }, [documents, settings.catalogs, settings.selectedCatalogIds]);

  return {
    settings,
    documents,
    extensionFieldDefs,
    selectedLabels,
    loading,
    error,
    refresh,
    importCatalog,
    saveCatalog,
    removeCatalog,
    setSelectedCatalogIds,
  };
}
