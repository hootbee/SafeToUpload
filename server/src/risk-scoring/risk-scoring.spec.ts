import { computeNormalizedRisk } from '@shared/risk-scoring';
import { applyRiskEscalationRules, extractDetectedSignals } from '@shared/risk-scoring';
import { calculateFinalRiskScore, calculateRiskLevel } from '@shared/risk-scoring';

describe('risk-scoring (PDF §13)', () => {
  it('PII only', () => {
    const result = computeNormalizedRisk({
      piiItems: [{ type: 'phone', label: '전화번호' }],
      platform: 'instagram',
    });
    expect(result.categoryScores.pii).toBeGreaterThanOrEqual(50);
    expect(result.riskLevel).toMatch(/medium|high|critical/);
  });

  it('EXIF GPS public context', () => {
    const result = computeNormalizedRisk({
      exifItems: [{ type: 'gps' }],
      contextResult: { uploadContext: 'public_upload' },
      platform: 'instagram',
    });
    expect(result.categoryScores.exif).toBeGreaterThanOrEqual(70);
  });

  it('ID card image critical', () => {
    const signals = extractDetectedSignals({
      imageRisks: [{ type: 'id_card_like' }],
    });
    const escalated = applyRiskEscalationRules(50, 'medium', signals);
    expect(escalated.level).toBe('critical');
  });

  it('multiple PII', () => {
    const result = computeNormalizedRisk({
      piiItems: [
        { type: 'name' },
        { type: 'phone' },
        { type: 'email' },
      ],
    });
    expect(result.categoryScores.pii).toBeGreaterThanOrEqual(70);
  });

  it('low risk', () => {
    const result = computeNormalizedRisk({
      contextResult: { uploadContext: 'private_storage' },
      platform: 'other',
    });
    expect(result.riskLevel).toBe('low');
  });

  it('malformed empty input', () => {
    const result = computeNormalizedRisk({});
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it('public vs private context', () => {
    const pub = computeNormalizedRisk({
      piiItems: [{ type: 'email' }],
      platform: 'instagram',
    });
    const priv = computeNormalizedRisk({
      piiItems: [{ type: 'email' }],
      platform: 'other',
      contextResult: { uploadContext: 'private_storage' },
    });
    expect(pub.riskScore).toBeGreaterThanOrEqual(priv.riskScore);
  });

  it('LLM image 0 with uploaded image uses fallback', () => {
    const result = computeNormalizedRisk({
      categoryScores: { pii: 20, exif: 5, image: 0, context: 25 },
      imageRisks: [{ type: 'building_sign', label: '114동' }],
      hasImage: true,
      platform: 'instagram',
    });
    expect(result.categoryScores.image).toBeGreaterThan(0);
  });

  it('dedupes duplicate risk reasons', () => {
    const result = computeNormalizedRisk({
      piiItems: [{ type: 'phone' }, { type: 'name' }, { type: 'email' }],
      riskReasons: {
        pii: [
          '복수의 직접 식별 개인정보가 포함되어 있습니다.',
          '복수의 직접 식별 개인정보가 포함되어 있습니다.',
        ],
      },
      platform: 'instagram',
    });
    const dup = result.riskReasons.pii.filter(
      (r) => r === '복수의 직접 식별 개인정보가 포함되어 있습니다.',
    );
    expect(dup.length).toBeLessThanOrEqual(1);
  });

  it('face + PII escalation', () => {
    const signals = extractDetectedSignals({
      piiItems: [{ type: 'phone' }],
      imageRisks: [{ type: 'face' }],
    });
    const escalated = applyRiskEscalationRules(
      calculateFinalRiskScore({ pii: 70, exif: 10, image: 60, context: 50 }),
      calculateRiskLevel(55),
      signals,
    );
    expect(escalated.level).toBe('high');
  });
});
