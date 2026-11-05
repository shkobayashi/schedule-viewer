/** 設定ダイアログの色・メンバー・ステータス節で共有する文言と UI フラグ。 */

export type SettingsCatalogConfirmCopy = {
  /** colors / statuses は aria-label。members は aria-modal のみ */
  ariaLabel?: string;
  useAriaModal?: boolean;
  body: (catalogId: string) => string;
  confirmButton: string;
  confirmPrimary?: boolean;
  cancelButton: string;
};

export type SettingsCatalogSectionKindCopy = {
  radioGroupName: string;
  selectedFallback: string;
  emptyListMessage: string;
  selectFailure: string;
  deleteFailure: string;
  /** 上書き確認の DOM 位置。members だけ一覧の後 */
  confirmPlacement: "beforeList" | "afterList";
  confirm: SettingsCatalogConfirmCopy;
  /** 選択解除ボタンの出し方 */
  clearSelectionMode: "whenAnyCatalog" | "whenSelected";
};

export const SETTINGS_CATALOG_SHARED_COPY = {
  importButton: "取り込み…",
  editButton: "項目を編集…",
  removeButton: "外す",
  clearSelection: "選択を解除",
  clearSelectionFailure: "選択を解除できませんでした。",
  importSuccess: (catalogId: string) => `「${catalogId}」を取り込みました。`,
  importFailure: "取り込みに失敗しました。",
  invalidJson: "JSON の形式が正しくありません。",
  currentPrefix: "使用中: ",
  unselected: "未選択",
} as const;

export const memberSettingsCatalogCopy: SettingsCatalogSectionKindCopy = {
  radioGroupName: "memberCatalog",
  selectedFallback: SETTINGS_CATALOG_SHARED_COPY.unselected,
  emptyListMessage: "取り込み済みのカタログはありません。",
  selectFailure: "カタログを選択できませんでした。",
  deleteFailure: "カタログを外せませんでした。",
  confirmPlacement: "afterList",
  confirm: {
    useAriaModal: true,
    body: (catalogId) =>
      `「${catalogId}」は既にあります。上書きして取り込みますか？`,
    confirmButton: "上書き",
    confirmPrimary: true,
    cancelButton: "キャンセル",
  },
  clearSelectionMode: "whenSelected",
};

export const colorSettingsCatalogCopy: SettingsCatalogSectionKindCopy = {
  radioGroupName: "colorCatalog",
  selectedFallback: SETTINGS_CATALOG_SHARED_COPY.unselected,
  emptyListMessage: "取り込み済みの一覧はありません。",
  selectFailure: "一覧を選択できませんでした。",
  deleteFailure: "一覧を外せませんでした。",
  confirmPlacement: "beforeList",
  confirm: {
    ariaLabel: "上書きの確認",
    body: (catalogId) => `「${catalogId}」は既にあります。上書きしますか。`,
    confirmButton: "上書きする",
    cancelButton: "やめる",
  },
  clearSelectionMode: "whenAnyCatalog",
};

export const statusSettingsCatalogCopy: SettingsCatalogSectionKindCopy = {
  radioGroupName: "statusCatalog",
  selectedFallback: "未選択（組み込みの三件）",
  emptyListMessage: "取り込み済みの一覧はありません。",
  selectFailure: "一覧を選択できませんでした。",
  deleteFailure: "一覧を外せませんでした。",
  confirmPlacement: "beforeList",
  confirm: {
    ariaLabel: "上書きの確認",
    body: (catalogId) => `「${catalogId}」は既にあります。上書きしますか。`,
    confirmButton: "上書きする",
    cancelButton: "やめる",
  },
  clearSelectionMode: "whenAnyCatalog",
};
