import {
  buildCandidateFromAnalysis,
  buildMemorySignal,
  computeMemoryMatchScore,
  containsRawPiiInProfile,
  sanitizePrivacyMemoryCandidate,
} from '@shared/privacy-memory';

describe('privacy-memory', () => {
  it('sanitize strips raw email', () => {
    const sanitized = sanitizePrivacyMemoryCandidate({
      piiTypes: ['email'],
      contextTags: ['university'],
      riskyCombinations: ['user@school.edu + university'],
      sourceTypes: ['text'],
      confidence: 0.9,
      riskWeight: 0.8,
    });
    expect(containsRawPiiInProfile(sanitized)).toBe(false);
    expect(sanitized.riskyCombinations.join(' ')).not.toMatch(/@/);
  });

  it('match score overlap', () => {
    const candidate = sanitizePrivacyMemoryCandidate({
      piiTypes: ['email'],
      contextTags: ['university'],
      riskyCombinations: ['email + university'],
      sourceTypes: ['text'],
      confidence: 0.8,
      riskWeight: 0.7,
    });
    const score = computeMemoryMatchScore(candidate, {
      id: '1',
      piiTypes: ['email'],
      contextTags: ['university'],
      riskyCombinations: ['email + university'],
      seenCount: 2,
      riskWeight: 0.5,
      confidence: 0.5,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
    expect(score).toBeGreaterThanOrEqual(20);
  });

  it('high match does not block until seenCount >= 2', () => {
    const candidate = buildCandidateFromAnalysis({
      piiItems: [{ type: 'document_like' }],
      contextResult: { public_upload: true, third_party_info: true },
      platform: 'instagram',
    });
    const signalOnce = buildMemorySignal(72, candidate, {
      enabled: true,
      useForBlocking: true,
      useForScoreBoost: true,
    }, 1);
    expect(signalOnce.shouldBlock).toBe(false);

    const signalRepeat = buildMemorySignal(72, candidate, {
      enabled: true,
      useForBlocking: true,
      useForScoreBoost: true,
    }, 2);
    expect(signalRepeat.matched).toBe(true);
  });
});
