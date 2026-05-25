import { Inject, Injectable } from '@nestjs/common';
import { applyDeterministicScoring, maxRiskLevel } from '@shared/risk-scoring';
import {
  buildCandidateFromAnalysis,
  findBestMemoryMatch,
  sanitizePrivacyMemoryCandidate,
  type MemorySignal,
  type PrivacyMemoryCandidate,
  type PrivacyMemoryProfile,
  type PrivacyMemorySettings,
} from '@shared/privacy-memory';
import type { AiAnalysisResponse } from '../ai-proxy/types/ai-analysis-response.type';
import type { PrivacyMemoryRepository } from './privacy-memory.repository';
import { PRIVACY_MEMORY_REPOSITORY } from './privacy-memory.tokens';

const DEFAULT_USER_ID = 'default';

@Injectable()
export class PrivacyMemoryService {
  constructor(
    @Inject(PRIVACY_MEMORY_REPOSITORY)
    private readonly repository: PrivacyMemoryRepository,
  ) {}

  async deleteExpired(userId = DEFAULT_USER_ID): Promise<number> {
    return this.repository.deleteExpired(userId);
  }

  async deleteAll(userId = DEFAULT_USER_ID): Promise<number> {
    return this.repository.deleteAll(userId);
  }

  async listSummaries(userId = DEFAULT_USER_ID) {
    await this.repository.deleteExpired(userId);
    const profiles = await this.repository.findActiveProfiles(userId);
    return profiles.map((p) => ({
      id: p.id,
      piiTypes: p.piiTypes,
      contextTags: p.contextTags,
      riskyCombinations: p.riskyCombinations,
      seenCount: p.seenCount,
      lastSeenAt: p.lastSeenAt.toISOString(),
      lastRiskLevel: p.lastRiskLevel,
    }));
  }

  private toSharedProfile(record: Awaited<ReturnType<PrivacyMemoryRepository['findActiveProfiles']>>[number]): PrivacyMemoryProfile {
    return {
      id: record.id,
      piiTypes: record.piiTypes,
      contextTags: record.contextTags,
      riskyCombinations: record.riskyCombinations,
      seenCount: record.seenCount,
      riskWeight: record.riskWeight,
      confidence: record.confidence,
      lastRiskLevel: record.lastRiskLevel,
      lastRiskScoreBand: record.lastRiskScoreBand,
      firstSeenAt: record.firstSeenAt.toISOString(),
      lastSeenAt: record.lastSeenAt.toISOString(),
    };
  }

  async matchAndBoost(
    aiResult: AiAnalysisResponse,
    settings: PrivacyMemorySettings,
    platform?: string,
    userId = DEFAULT_USER_ID,
  ): Promise<AiAnalysisResponse> {
    if (!settings.enabled) {
      return { ...aiResult, memorySignal: undefined };
    }

    await this.repository.deleteExpired(userId);
    const records = await this.repository.findActiveProfiles(userId);
    const profiles = records.map((r) => this.toSharedProfile(r));

    const candidate = buildCandidateFromAnalysis({
      piiItems: aiResult.piiItems as Array<Record<string, unknown>>,
      exifItems: aiResult.exifItems as Array<Record<string, unknown>>,
      imageRisks: aiResult.imageRisks as Array<Record<string, unknown>>,
      contextResult: aiResult.contextResult,
      privacyMemoryCandidate: aiResult.privacyMemoryCandidate,
      platform,
    });

    const memorySignal: MemorySignal = findBestMemoryMatch(candidate, profiles, settings);

    if (!memorySignal.matched || !settings.useForScoreBoost) {
      return { ...aiResult, privacyMemoryCandidate: candidate, memorySignal };
    }

    const scoring = applyDeterministicScoring(
      {
        piiItems: aiResult.piiItems as Array<Record<string, unknown>>,
        exifItems: aiResult.exifItems as Array<Record<string, unknown>>,
        imageRisks: aiResult.imageRisks as Array<Record<string, unknown>>,
        contextResult: aiResult.contextResult,
        categoryScores: aiResult.categoryScores,
        riskReasons: aiResult.riskReasons,
        platform,
      },
      { piiBoost: memorySignal.piiBoost, contextBoost: memorySignal.contextBoost },
    );

    let riskLevel = scoring.riskLevel;
    if (memorySignal.shouldBlock) {
      riskLevel = maxRiskLevel(riskLevel, 'high');
    }

    return {
      ...aiResult,
      riskScore: scoring.riskScore,
      riskLevel: riskLevel as AiAnalysisResponse['riskLevel'],
      categoryScores: scoring.categoryScores,
      scoreBreakdown: scoring.scoreBreakdown,
      riskReasons: scoring.riskReasons,
      escalationRules: [
        ...aiResult.escalationRules,
        ...(memorySignal.message ? [memorySignal.message] : []),
      ],
      privacyMemoryCandidate: candidate,
      memorySignal,
    };
  }

  async upsertAfterAnalysis(
    aiResult: AiAnalysisResponse,
    settings: PrivacyMemorySettings & { retentionDays: number },
    userId = DEFAULT_USER_ID,
  ): Promise<void> {
    if (!settings.enabled) return;

    const candidate: PrivacyMemoryCandidate = sanitizePrivacyMemoryCandidate(
      aiResult.privacyMemoryCandidate ??
      buildCandidateFromAnalysis({
        piiItems: aiResult.piiItems as Array<Record<string, unknown>>,
        exifItems: aiResult.exifItems as Array<Record<string, unknown>>,
        imageRisks: aiResult.imageRisks as Array<Record<string, unknown>>,
        contextResult: aiResult.contextResult,
      }),
    );

    const band =
      aiResult.riskScore >= 80
        ? '80-100'
        : aiResult.riskScore >= 60
          ? '60-79'
          : aiResult.riskScore >= 35
            ? '35-59'
            : '0-34';

    await this.repository.upsertProfile(userId, candidate, {
      lastRiskLevel: aiResult.riskLevel,
      lastRiskScoreBand: band,
      retentionDays: settings.retentionDays,
    });
  }
}
