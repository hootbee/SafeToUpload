import { applyDeterministicScoring, maxRiskLevel } from '@shared/risk-scoring';
import {
  buildCandidateFromAnalysis,
  findBestMemoryMatch,
  sanitizePrivacyMemoryCandidate,
  type MemorySignal,
  type PrivacyMemoryCandidate,
  type PrivacyMemoryProfile,
} from '@shared/privacy-memory';
import type { AiAnalysisResponse } from '../shared/aiTypes';
import type { SettingsState } from '../shared/types';

const DB_NAME = 'safetoupload_privacy_memory';
const DB_VERSION = 1;
const STORE = 'profiles';

interface StoredProfile {
  id: string;
  piiTypes: string[];
  contextTags: string[];
  riskyCombinations: string[];
  sourceTypes: string[];
  seenCount: number;
  riskWeight: number;
  confidence: number;
  lastRiskLevel?: string | null;
  lastRiskScoreBand?: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  expiresAt?: string | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function listProfiles(): Promise<PrivacyMemoryProfile[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const now = Date.now();
      const rows = (req.result as StoredProfile[]).filter(
        (p) => !p.expiresAt || new Date(p.expiresAt).getTime() > now,
      );
      resolve(
        rows.map((p) => ({
          id: p.id,
          piiTypes: p.piiTypes,
          contextTags: p.contextTags,
          riskyCombinations: p.riskyCombinations,
          seenCount: p.seenCount,
          riskWeight: p.riskWeight,
          confidence: p.confidence,
          lastRiskLevel: p.lastRiskLevel,
          lastRiskScoreBand: p.lastRiskScoreBand,
          firstSeenAt: p.firstSeenAt,
          lastSeenAt: p.lastSeenAt,
        })),
      );
    };
    req.onerror = () => reject(req.error);
  });
}

function profileKey(candidate: PrivacyMemoryCandidate): string {
  return [
    [...candidate.piiTypes].sort().join(','),
    [...candidate.contextTags].sort().join(','),
    [...candidate.riskyCombinations].sort().join('|'),
  ].join('::');
}

async function upsertProfile(
  candidate: PrivacyMemoryCandidate,
  meta: { lastRiskLevel: string; lastRiskScoreBand: string; retentionDays: number },
): Promise<void> {
  const db = await openDb();
  const key = profileKey(candidate);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + meta.retentionDays);

  const dbProfiles = await new Promise<StoredProfile[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredProfile[]);
    req.onerror = () => reject(req.error);
  });

  const stored = dbProfiles.find(
    (p) =>
      profileKey({
        piiTypes: p.piiTypes,
        contextTags: p.contextTags,
        riskyCombinations: p.riskyCombinations,
        sourceTypes: p.sourceTypes ?? [],
        confidence: p.confidence,
        riskWeight: p.riskWeight,
      }) === key,
  );

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const now = new Date().toISOString();

    if (stored) {
      store.put({
        ...stored,
        seenCount: stored.seenCount + 1,
        riskWeight: Math.max(stored.riskWeight, candidate.riskWeight),
        confidence: Math.max(stored.confidence, candidate.confidence),
        lastRiskLevel: meta.lastRiskLevel,
        lastRiskScoreBand: meta.lastRiskScoreBand,
        lastSeenAt: now,
        expiresAt: expiresAt.toISOString(),
      });
    } else {
      store.put({
        id: crypto.randomUUID(),
        piiTypes: candidate.piiTypes,
        contextTags: candidate.contextTags,
        riskyCombinations: candidate.riskyCombinations,
        sourceTypes: candidate.sourceTypes,
        seenCount: 1,
        riskWeight: candidate.riskWeight,
        confidence: candidate.confidence,
        lastRiskLevel: meta.lastRiskLevel,
        lastRiskScoreBand: meta.lastRiskScoreBand,
        firstSeenAt: now,
        lastSeenAt: now,
        expiresAt: expiresAt.toISOString(),
      });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAllPrivacyMemory(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function applyLocalPrivacyMemory(
  aiResult: AiAnalysisResponse,
  platform: string,
  settings: SettingsState,
): Promise<AiAnalysisResponse> {
  if (!settings.privacyMemoryEnabled) {
    return aiResult;
  }

  const memorySettings = {
    enabled: settings.privacyMemoryEnabled,
    useForBlocking: settings.privacyMemoryUseForBlocking,
    useForScoreBoost: settings.privacyMemoryUseForScoreBoost,
  };

  const candidate = buildCandidateFromAnalysis({
    piiItems: aiResult.piiItems as Array<Record<string, unknown>>,
    exifItems: aiResult.exifItems,
    imageRisks: aiResult.imageRisks,
    contextResult: aiResult.contextResult,
    privacyMemoryCandidate: aiResult.privacyMemoryCandidate,
    platform,
  });

  const profiles = await listProfiles();
  const memorySignal: MemorySignal = findBestMemoryMatch(candidate, profiles, memorySettings);

  let next = { ...aiResult, privacyMemoryCandidate: candidate, memorySignal };

  if (memorySignal.matched && settings.privacyMemoryUseForScoreBoost) {
    const scoring = applyDeterministicScoring(
      {
        piiItems: aiResult.piiItems as Array<Record<string, unknown>>,
        exifItems: aiResult.exifItems,
        imageRisks: aiResult.imageRisks,
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

    next = {
      ...next,
      riskScore: scoring.riskScore,
      riskLevel,
      categoryScores: scoring.categoryScores,
      scoreBreakdown: scoring.scoreBreakdown,
      riskReasons: scoring.riskReasons,
      escalationRules: [
        ...aiResult.escalationRules,
        ...(memorySignal.message ? [memorySignal.message] : []),
      ],
    };
  }

  const band =
    next.riskScore >= 80
      ? '80-100'
      : next.riskScore >= 60
        ? '60-79'
        : next.riskScore >= 35
          ? '35-59'
          : '0-34';

  await upsertProfile(sanitizePrivacyMemoryCandidate(candidate), {
    lastRiskLevel: next.riskLevel,
    lastRiskScoreBand: band,
    retentionDays: settings.privacyMemoryRetentionDays,
  });

  return next;
}
