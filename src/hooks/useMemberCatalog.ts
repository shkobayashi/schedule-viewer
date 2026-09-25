import { useCallback, useEffect, useMemo, useState } from "react";
import type { Member } from "../model/memberTypes";
import {
  deleteMemberCatalog,
  importMemberCatalog,
  loadAppMembersSettings,
  readMemberCatalog,
  setSelectedMemberCatalog,
  type AppMembersSettings,
} from "../model/memberAppData";
import { memberMapFromList } from "../model/assigneeDisplay";

export function useMemberCatalog() {
  const [settings, setSettings] = useState<AppMembersSettings>({
    selectedCatalogId: null,
    catalogs: [],
  });
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextSettings = await loadAppMembersSettings();
      setSettings(nextSettings);
      if (nextSettings.selectedCatalogId) {
        const doc = await readMemberCatalog(nextSettings.selectedCatalogId);
        setMembers(doc?.members ?? null);
      } else {
        setMembers(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "メンバー設定を読み込めませんでした。");
      setMembers(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectCatalog = useCallback(
    async (catalogId: string | null) => {
      await setSelectedMemberCatalog(catalogId);
      await refresh();
    },
    [refresh],
  );

  const importCatalog = useCallback(
    async (catalogId: string, contents: string, overwrite: boolean) => {
      await importMemberCatalog(catalogId, contents, overwrite);
      await setSelectedMemberCatalog(catalogId);
      await refresh();
    },
    [refresh],
  );

  const removeCatalog = useCallback(
    async (catalogId: string) => {
      await deleteMemberCatalog(catalogId);
      await refresh();
    },
    [refresh],
  );

  const memberMap = useMemo(() => memberMapFromList(members), [members]);

  const selectedCatalogLabel = useMemo(() => {
    if (!settings.selectedCatalogId) return null;
    return (
      settings.catalogs.find((c) => c.id === settings.selectedCatalogId)?.label ??
      settings.selectedCatalogId
    );
  }, [settings]);

  return {
    settings,
    members,
    memberMap,
    selectedCatalogLabel,
    loading,
    error,
    refresh,
    selectCatalog,
    importCatalog,
    removeCatalog,
  };
}
