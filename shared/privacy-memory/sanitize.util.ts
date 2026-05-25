import { ALLOWED_CONTEXT_TAGS, ALLOWED_PII_TYPES, type PrivacyMemoryCandidate } from './privacy-memory.types';

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/;
const STUDENT_ID_PATTERN = /\b\d{8,12}\b/;
const URL_PATTERN = /https?:\/\/[^\s]+/i;

const PII_SET = new Set<string>(ALLOWED_PII_TYPES);
const TAG_SET = new Set<string>(ALLOWED_CONTEXT_TAGS);

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function stripSensitiveFromCombination(combo: string): string {
  let out = combo;
  out = out.replace(EMAIL_PATTERN, 'email');
  out = out.replace(PHONE_PATTERN, 'phone');
  out = out.replace(STUDENT_ID_PATTERN, 'student_id_like');
  out = out.replace(URL_PATTERN, 'public_upload');
  return out.trim();
}

export function sanitizePrivacyMemoryCandidate(
  raw: Partial<PrivacyMemoryCandidate> | undefined,
): PrivacyMemoryCandidate {
  const piiTypes = (raw?.piiTypes ?? [])
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => PII_SET.has(t));

  const contextTags = (raw?.contextTags ?? [])
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => TAG_SET.has(t));

  const riskyCombinations = (raw?.riskyCombinations ?? [])
    .map((c) => stripSensitiveFromCombination(String(c)))
    .filter((c) => c.includes('+') && !EMAIL_PATTERN.test(c) && !PHONE_PATTERN.test(c));

  const sourceTypes = (raw?.sourceTypes ?? [])
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  return {
    piiTypes: [...new Set(piiTypes)],
    contextTags: [...new Set(contextTags)],
    riskyCombinations: [...new Set(riskyCombinations)],
    sourceTypes: [...new Set(sourceTypes)],
    confidence: clamp01(Number(raw?.confidence ?? 0.5)),
    riskWeight: clamp01(Number(raw?.riskWeight ?? 0.5)),
  };
}

export function containsRawPiiInProfile(data: unknown): boolean {
  const hay = JSON.stringify(data);
  return EMAIL_PATTERN.test(hay) || PHONE_PATTERN.test(hay);
}
