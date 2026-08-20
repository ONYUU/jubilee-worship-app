import {
  isStoreReadyPrivacyPolicy,
  type MobilePublicLegalDocument
} from "@jubilee/domain";

export function selectStoreReadyPrivacyPolicy(
  documents: MobilePublicLegalDocument[]
): MobilePublicLegalDocument | null {
  return documents.find((document) => isStoreReadyPrivacyPolicy(document)) ?? null;
}
