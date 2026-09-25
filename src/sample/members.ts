import type { MembersDocument } from "../model/memberTypes";
import { MEMBERS_SCHEMA_VERSION } from "../model/memberTypes";
import { SAMPLE_MEMBER_IDS } from "./ids";

export const sampleMembersDocument = (): MembersDocument => ({
  schemaVersion: MEMBERS_SCHEMA_VERSION,
  members: [
    { id: SAMPLE_MEMBER_IDS.tanaka, name: "田中" },
    { id: SAMPLE_MEMBER_IDS.sato, name: "佐藤" },
    { id: SAMPLE_MEMBER_IDS.suzuki, name: "鈴木" },
    { id: SAMPLE_MEMBER_IDS.takahashi, name: "高橋" },
  ],
});

export function sampleMembersJson(): string {
  return JSON.stringify(sampleMembersDocument(), null, 2);
}
