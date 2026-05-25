import { Injectable } from '@nestjs/common';
import type { PrivacyMemoryCandidate } from '@shared/privacy-memory';
import { PrismaService } from '../prisma/prisma.service';
import type { PrivacyMemoryProfileRecord, PrivacyMemoryRepository } from './privacy-memory.repository';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
}

@Injectable()
export class PrismaPrivacyMemoryRepository implements PrivacyMemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveProfiles(userId: string): Promise<PrivacyMemoryProfileRecord[]> {
    const rows = await this.prisma.privacyMemoryProfile.findMany({
      where: { userId, isActive: true },
      orderBy: { lastSeenAt: 'desc' },
      take: 200,
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      piiTypes: asStringArray(row.piiTypes),
      contextTags: asStringArray(row.contextTags),
      riskyCombinations: asStringArray(row.riskyCombinations),
      sourceTypes: asStringArray(row.sourceTypes),
      seenCount: row.seenCount,
      riskWeight: row.riskWeight,
      confidence: row.confidence,
      lastRiskLevel: row.lastRiskLevel,
      lastRiskScoreBand: row.lastRiskScoreBand,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      expiresAt: row.expiresAt,
    }));
  }

  private profileKey(candidate: PrivacyMemoryCandidate): string {
    const pii = [...candidate.piiTypes].sort().join(',');
    const tags = [...candidate.contextTags].sort().join(',');
    const combos = [...candidate.riskyCombinations].sort().join('|');
    return `${pii}::${tags}::${combos}`;
  }

  async upsertProfile(
    userId: string,
    candidate: PrivacyMemoryCandidate,
    meta: { lastRiskLevel: string; lastRiskScoreBand: string; retentionDays: number },
  ): Promise<void> {
    const profiles = await this.findActiveProfiles(userId);
    const key = this.profileKey(candidate);

    const existing = profiles.find(
      (p) =>
        this.profileKey({
          piiTypes: p.piiTypes,
          contextTags: p.contextTags,
          riskyCombinations: p.riskyCombinations,
          sourceTypes: p.sourceTypes,
          confidence: p.confidence,
          riskWeight: p.riskWeight,
        }) === key,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + meta.retentionDays);

    if (existing) {
      await this.prisma.privacyMemoryProfile.update({
        where: { id: existing.id },
        data: {
          seenCount: existing.seenCount + 1,
          riskWeight: Math.max(existing.riskWeight, candidate.riskWeight),
          confidence: Math.max(existing.confidence, candidate.confidence),
          lastRiskLevel: meta.lastRiskLevel,
          lastRiskScoreBand: meta.lastRiskScoreBand,
          lastSeenAt: new Date(),
          expiresAt,
        },
      });
      return;
    }

    await this.prisma.privacyMemoryProfile.create({
      data: {
        userId,
        piiTypes: candidate.piiTypes,
        contextTags: candidate.contextTags,
        riskyCombinations: candidate.riskyCombinations,
        sourceTypes: candidate.sourceTypes,
        seenCount: 1,
        riskWeight: candidate.riskWeight,
        confidence: candidate.confidence,
        lastRiskLevel: meta.lastRiskLevel,
        lastRiskScoreBand: meta.lastRiskScoreBand,
        expiresAt,
      },
    });
  }

  async deleteAll(userId: string): Promise<number> {
    const result = await this.prisma.privacyMemoryProfile.deleteMany({ where: { userId } });
    return result.count;
  }

  async deleteExpired(userId: string): Promise<number> {
    const result = await this.prisma.privacyMemoryProfile.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}
