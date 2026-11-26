import type { AppColorsSettings } from "../model/colorAppData";
import {
  pickColorsJsonFile,
  colorCatalogIdFromFilename,
} from "../model/colorAppData";
import {
  formatColorsValidationErrors,
  validateColors,
} from "../model/validateColors";
import { colorSettingsCatalogCopy } from "../model/settingsCatalogSectionCopy";
import { SettingsCatalogSection } from "./SettingsCatalogSection";

export type SettingsColorsSectionProps = {
  settings: AppColorsSettings;
  selectedCatalogLabel: string | null;
  onImport: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  onSelectCatalog: (catalogId: string | null) => Promise<void>;
  onDeleteCatalog: (catalogId: string) => Promise<void>;
  onOpenEditor: () => void;
};

/** 設定の「色」欄。一覧 JSON の取り込み、選択、外すを行う。 */
export function SettingsColorsSection(props: SettingsColorsSectionProps) {
  return (
    <SettingsCatalogSection
      {...props}
      kindCopy={colorSettingsCatalogCopy}
      note={
        <>
          色の一覧 JSON をアプリデータへ取り込み、行の地に使う色を一つ選びます。タスクが持つのは
          <code>colorId</code> だけで、一覧はスケジュール JSON に含めません。選んでいないときは、行の地は塗りません。組み込みの色には戻りません。
        </>
      }
      pickFile={pickColorsJsonFile}
      catalogIdFromFilename={colorCatalogIdFromFilename}
      validateImportedJson={(data) => {
        const parsed = validateColors(data);
        return parsed.ok
          ? { ok: true }
          : { ok: false, message: formatColorsValidationErrors(parsed.errors) };
      }}
    />
  );
}
