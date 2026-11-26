import type { ScheduleFieldDef } from "./types";

export type FieldExtensionItemDef = {
  id: string;
  name: string;
  type: ScheduleFieldDef["type"];
  meaning?: string;
  instruction?: string;
  required?: true;
  default?: string | number;
  percent?: true;
  choices?: string[];
};

export type FieldExtensionDocument = {
  schemaVersion: 1;
  id: string;
  name: string;
  fields: FieldExtensionItemDef[];
};

export type FieldExtensionCatalogInfo = {
  id: string;
  label: string;
};

export type AppFieldExtensionsSettings = {
  selectedCatalogIds: string[];
  catalogs: FieldExtensionCatalogInfo[];
};
