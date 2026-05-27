export declare const ALLOWED_PII_TYPES: readonly ["email", "phone", "name_like", "student_id_like", "address_like", "account_like", "card_like", "government_id_like", "affiliation_like", "face", "id_card_like", "document_like", "plate_like"];
export declare const ALLOWED_CONTEXT_TAGS: readonly ["university", "academic_document", "assignment", "workplace", "hospital", "public_upload", "social_media", "private_storage", "third_party_info", "minor_possible", "document_capture", "id_card_capture", "screenshot", "location_exposure", "contact_info", "identity_bundle", "gps_exif"];
export interface PrivacyMemoryCandidate {
    piiTypes: string[];
    contextTags: string[];
    riskyCombinations: string[];
    sourceTypes: string[];
    confidence: number;
    riskWeight: number;
}
export interface PrivacyMemoryProfile {
    id: string;
    piiTypes: string[];
    contextTags: string[];
    riskyCombinations: string[];
    sourceTypes?: string[];
    seenCount: number;
    riskWeight: number;
    confidence: number;
    lastRiskLevel?: string | null;
    lastRiskScoreBand?: string | null;
    firstSeenAt: string;
    lastSeenAt: string;
}
export interface MemorySignal {
    matched: boolean;
    memoryMatchScore: number;
    piiBoost: number;
    contextBoost: number;
    shouldBlock: boolean;
    message?: string;
}
export interface PrivacyMemorySettings {
    enabled: boolean;
    useForBlocking: boolean;
    useForScoreBoost: boolean;
}
