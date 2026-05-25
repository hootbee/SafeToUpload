import type { MemorySignal, PrivacyMemoryCandidate, PrivacyMemoryProfile, PrivacyMemorySettings } from './privacy-memory.types';

function overlapCount(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x)).length;
}

export function computeMemoryMatchScore(
  candidate: PrivacyMemoryCandidate,
  profile: PrivacyMemoryProfile,
): number {
  const piiOverlap = overlapCount(candidate.piiTypes, profile.piiTypes);
  const tagOverlap = overlapCount(candidate.contextTags, profile.contextTags);
  const comboOverlap = overlapCount(candidate.riskyCombinations, profile.riskyCombinations);

  return (
    piiOverlap * 10 +
    tagOverlap * 6 +
    comboOverlap * 20 +
    Math.min(profile.seenCount, 5) * 4 +
    profile.riskWeight * 20
  );
}

/** 차단에 필요한 최소 누적 횟수(이전 분석에서 동일 패턴이 이만큼 쌓인 뒤에만 차단) */
export const MIN_SEEN_COUNT_FOR_BLOCK = 2;

function shouldBlockForCandidate(
  candidate: PrivacyMemoryCandidate,
  matchScore: number,
  profileSeenCount: number,
): boolean {
  // 1회만 저장된 패턴은 점수 상향만, 차단은 진짜 반복(2회 이상 누적)부터
  if (profileSeenCount < MIN_SEEN_COUNT_FOR_BLOCK) return false;
  if (matchScore < 70) return false;

  const piiSet = new Set(candidate.piiTypes);
  const tagSet = new Set(candidate.contextTags);
  const combos = candidate.riskyCombinations.map((c) => c.toLowerCase());

  const hasAnyPii = piiSet.size > 0;
  const publicUpload = tagSet.has('public_upload') || tagSet.has('social_media');
  const thirdParty = tagSet.has('third_party_info');
  const idCard = piiSet.has('id_card_like');
  const document = piiSet.has('document_like');
  const face = piiSet.has('face');
  const nameLike = piiSet.has('name_like');
  const affiliation = piiSet.has('affiliation_like');
  const gps = tagSet.has('gps_exif') || tagSet.has('location_exposure');

  if (publicUpload && thirdParty) return true;
  if (idCard && hasAnyPii) return true;
  if (document && hasAnyPii) return true;
  if (face && nameLike && publicUpload) return true;
  if (face && affiliation && tagSet.has('social_media')) return true;
  if (gps && publicUpload) return true;

  return combos.some(
    (c) =>
      c.includes('public_upload') &&
      (c.includes('document') || c.includes('third_party') || c.includes('id_card')),
  );
}

export function buildMemorySignal(
  matchScore: number,
  candidate: PrivacyMemoryCandidate,
  settings: PrivacyMemorySettings,
  profileSeenCount = 0,
): MemorySignal {
  if (!settings.enabled || matchScore < 20) {
    return {
      matched: false,
      memoryMatchScore: matchScore,
      piiBoost: 0,
      contextBoost: 0,
      shouldBlock: false,
    };
  }

  let piiBoost = 0;
  let contextBoost = 0;

  if (matchScore >= 70) {
    piiBoost = 20;
    contextBoost = 25;
  } else if (matchScore >= 40) {
    piiBoost = 10;
    contextBoost = 15;
  } else {
    piiBoost = 5;
    contextBoost = 5;
  }

  if (!settings.useForScoreBoost) {
    piiBoost = 0;
    contextBoost = 0;
  }

  const shouldBlock =
    settings.useForBlocking && shouldBlockForCandidate(candidate, matchScore, profileSeenCount);

  return {
    matched: true,
    memoryMatchScore: matchScore,
    piiBoost,
    contextBoost,
    shouldBlock,
    message: shouldBlock
      ? `비슷한 위험 패턴이 이전 분석에서 ${profileSeenCount}회 이상 나타났습니다. 개인정보 원문은 저장하지 않았지만, 반복 노출 위험이 커서 업로드를 권장하지 않습니다.`
      : '유사한 위험 맥락이 과거 분석에서 반복 탐지되어 위험도가 상향되었습니다.',
  };
}

export function findBestMemoryMatch(
  candidate: PrivacyMemoryCandidate,
  profiles: PrivacyMemoryProfile[],
  settings: PrivacyMemorySettings,
): MemorySignal {
  let bestScore = 0;
  let bestSignal: MemorySignal = {
    matched: false,
    memoryMatchScore: 0,
    piiBoost: 0,
    contextBoost: 0,
    shouldBlock: false,
  };

  for (const profile of profiles) {
    const score = computeMemoryMatchScore(candidate, profile);
    if (score > bestScore) {
      bestScore = score;
      bestSignal = buildMemorySignal(score, candidate, settings, profile.seenCount);
    }
  }

  return bestSignal;
}
