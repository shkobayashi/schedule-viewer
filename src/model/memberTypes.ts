export const MEMBERS_SCHEMA_VERSION = 1;

export type MemberId = string;

export type Member = {
  id: MemberId;
  name: string;
};

export type MembersDocument = {
  schemaVersion: typeof MEMBERS_SCHEMA_VERSION;
  members: Member[];
};

/** アプリデータ内の取り込み済みカタログ（ファイル名 stem）。 */
export type MemberCatalogInfo = {
  id: string;
  label: string;
};
