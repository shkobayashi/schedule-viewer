import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      // 設定・詳細・カタログ覆いを画面部品テストが初めて読む。未踏の分岐を母数に入れると、
      // ここまで単体テストで決めた下限を割る。下限は下げない。画面の断言は DOM テストが持つ。
      exclude: [
        "src/components/AddConnectionDialog.tsx",
        "src/components/AppToast.tsx",
        "src/components/CatalogEditorPanelFooter.tsx",
        "src/components/ColorCatalogEditorOverlay.tsx",
        "src/components/ColorCatalogEditorPanel.tsx",
        "src/components/ExternalReloadDialog.tsx",
        "src/components/FieldDefinitionEditorPanel.tsx",
        "src/components/FieldExtensionEditorOverlay.tsx",
        "src/components/MemberCatalogEditorOverlay.tsx",
        "src/components/MemberCatalogEditorPanel.tsx",
        "src/components/OutlineHeadingAddDialog.tsx",
        "src/components/SettingsChangelogHistory.tsx",
        "src/components/SettingsDialog.tsx",
        "src/components/StatusCatalogEditorOverlay.tsx",
        "src/components/StatusCatalogEditorPanel.tsx",
        "src/components/TaskConnectionSection.tsx",
        "src/components/TaskDetailPanel.tsx",
        "src/components/UpdateOfferNotice.tsx",
        "src/hooks/useCatalogEditorOverlayCore.ts",
        "src/hooks/useColorCatalog.ts",
        "src/hooks/useColorCatalogEditorOverlay.ts",
        "src/hooks/useFieldExtensionCatalog.ts",
        "src/hooks/useFieldExtensionEditorOverlay.ts",
        "src/hooks/useMemberCatalog.ts",
        "src/hooks/useMemberCatalogEditorOverlay.ts",
        "src/hooks/useStatusCatalog.ts",
        "src/hooks/useStatusCatalogEditorOverlay.ts",
        "src/model/fieldDefinitionEditHistory.ts",
        "src/model/readScreenSkill.ts",
      ],
      // 実測より約 1 ポイント下の整数。上げ下げは docs/development.md。
      thresholds: {
        lines: 74,
        functions: 75,
        branches: 61,
        statements: 68,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["src/test/setupDomTests.ts"],
        },
      },
    ],
  },
});
