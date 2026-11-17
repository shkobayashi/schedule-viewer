import type { AppMembersSettings } from "../model/memberAppData";
import {
  pickMembersJsonFile,
  catalogIdFromFilename,
} from "../model/memberAppData";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "../model/validateMembers";
import { memberSettingsCatalogCopy } from "../model/settingsCatalogSectionCopy";
import { SettingsCatalogSection } from "./SettingsCatalogSection";

export type SettingsMembersSectionProps = {
  settings: AppMembersSettings;
  selectedCatalogLabel: string | null;
  onImport: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  onSelectCatalog: (catalogId: string | null) => Promise<void>;
  onDeleteCatalog: (catalogId: string) => Promise<void>;
  onOpenEditor: () => void;
};

/** 設定の「メンバー」欄。カタログ JSON の取り込み、選択、外すを行う。 */
export function SettingsMembersSection(props: SettingsMembersSectionProps) {
  return (
    <SettingsCatalogSection
      {...props}
      kindCopy={memberSettingsCatalogCopy}
      note={
        <>
          メンバー JSON をアプリデータへ取り込み、表示に使うカタログを選びます。スケジュール
          JSON には含めません。
        </>
      }
      pickFile={pickMembersJsonFile}
      catalogIdFromFilename={catalogIdFromFilename}
      validateImportedJson={(data) => {
        const parsed = validateMembers(data);
        return parsed.ok
          ? { ok: true }
          : { ok: false, message: formatMembersValidationErrors(parsed.errors) };
      }}
    />
  );
}
