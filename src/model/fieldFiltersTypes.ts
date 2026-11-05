export type FieldFilterEmptyMode = "any" | "keep" | "exclude";

export type FieldFilterCondition = {
  empty: FieldFilterEmptyMode;
  text?: string;
  min?: number;
  max?: number;
  from?: string;
  to?: string;
  choice?: string;
};

export type FieldFiltersState = Record<string, FieldFilterCondition>;

export const DEFAULT_FIELD_FILTER_EMPTY: FieldFilterEmptyMode = "any";
