import type { AppStatusesSettings } from "../model/statusAppData";
import {
  pickStatusesJsonFile,
  statusCatalogIdFromFilename,
} from "../model/statusAppData";
import {
  formatStatusesValidationErrors,
  validateStatuses,
} from "../model/validateStatuses";
import { statusSettingsCatalogCopy } from "../model/settingsCatalogSectionCopy";
import { SettingsCatalogSection } from "./SettingsCatalogSection";

export type SettingsStatusesSectionProps = {
  settings: AppStatusesSettings;
  selectedCatalogLabel: string | null;
  onImport: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  onSelectCatalog: (catalogId: string | null) => Promise<void>;
  onDeleteCatalog: (catalogId: string) => Promise<void>;
  onOpenEditor: () => void;
};

/** 設定の「ステータス」欄。一覧 JSON の取り込み、選択、外すを行う。 */
export function SettingsStatusesSection(props: SettingsStatusesSectionProps) {
  return (
    <SettingsCatalogSection
      {...props}
      kindCopy={statusSettingsCatalogCopy}
      note={
        <>
          ステータスの一覧 JSON をアプリデータへ取り込み、タスクに付けられるステータスを選びます。タスクが持つのは
          <code>id</code> だけで、一覧はスケジュール JSON に含めません。選んでいないときは、未着手・進行中・完了の三件を使います。
        </>
      }
      pickFile={pickStatusesJsonFile}
      catalogIdFromFilename={statusCatalogIdFromFilename}
      validateImportedJson={(data) => {
        const parsed = validateStatuses(data);
        return parsed.ok
          ? { ok: true }
          : { ok: false, message: formatStatusesValidationErrors(parsed.errors) };
      }}
    />
  );
}
