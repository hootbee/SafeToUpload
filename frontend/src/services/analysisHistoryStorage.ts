import type { HistoryItem, InferenceMode, Platform, RiskReportData, SettingsState } from '../shared/types';

const STORAGE_KEY = 'safeToUploadAnalysisHistory:v1';
const MAX_ENTRIES = 50;

/** blob URL은 저장하지 않음 (재시작 후 무효) */
export type StoredRiskReport = Omit<
  RiskReportData,
  'imagePreviewUrl' | 'imagePreviewUrls' | 'maskedImagePreviewUrl' | 'imageEntries'
>;

export interface StoredAnalysisEntry {
  id: string;
  createdAt: string;
  platform: Platform;
  inferenceMode: InferenceMode;
  riskLevel: HistoryItem['riskLevel'];
  summary: string;
  report: StoredRiskReport;
}

interface StoragePayload {
  entries: StoredAnalysisEntry[];
}

function stripReportForStorage(report: RiskReportData): StoredRiskReport {
  const {
    imagePreviewUrl: _p,
    imagePreviewUrls: _ps,
    maskedImagePreviewUrl: _m,
    imageEntries: _entries,
    ...rest
  } = report;
  return rest;
}

function readFallback(): StoragePayload {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as StoragePayload;
    return Array.isArray(parsed.entries) ? parsed : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function writeFallback(payload: StoragePayload): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

async function readPayload(): Promise<StoragePayload> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const raw = result[STORAGE_KEY] as StoragePayload | undefined;
    if (raw && Array.isArray(raw.entries)) return raw;
    return { entries: [] };
  }
  return readFallback();
}

async function writePayload(payload: StoragePayload): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY]: payload });
    return;
  }
  writeFallback(payload);
}

function retentionCutoffMs(retentionDays: SettingsState['retentionDays']): number {
  return Date.now() - retentionDays * 24 * 60 * 60 * 1000;
}

export function storedEntryToHistoryItem(entry: StoredAnalysisEntry): HistoryItem {
  return {
    id: entry.id,
    date: entry.createdAt.slice(0, 10),
    platform: entry.platform,
    riskLevel: entry.riskLevel,
    summary: entry.summary,
    riskScore: entry.report.score ?? null,
  };
}

export async function listStoredAnalysisEntries(
  retentionDays: SettingsState['retentionDays'] = 30,
): Promise<StoredAnalysisEntry[]> {
  const payload = await readPayload();
  const cutoff = retentionCutoffMs(retentionDays);
  return payload.entries
    .filter((e) => new Date(e.createdAt).getTime() >= cutoff)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getStoredAnalysisEntry(id: string): Promise<StoredAnalysisEntry | null> {
  const payload = await readPayload();
  return payload.entries.find((e) => e.id === id) ?? null;
}

export async function saveAnalysisEntry(params: {
  id: string;
  platform: Platform;
  inferenceMode: InferenceMode;
  summary: string;
  report: RiskReportData;
}): Promise<void> {
  const payload = await readPayload();
  const entry: StoredAnalysisEntry = {
    id: params.id,
    createdAt: new Date().toISOString(),
    platform: params.platform,
    inferenceMode: params.inferenceMode,
    riskLevel: params.report.riskLevel,
    summary: params.summary,
    report: stripReportForStorage(params.report),
  };

  const withoutDup = payload.entries.filter((e) => e.id !== entry.id);
  const entries = [entry, ...withoutDup].slice(0, MAX_ENTRIES);
  await writePayload({ entries });
}

export async function clearStoredAnalysisHistory(): Promise<void> {
  await writePayload({ entries: [] });
}

export function mergeHistoryItems(server: HistoryItem[], local: HistoryItem[]): HistoryItem[] {
  const byId = new Map<string, HistoryItem>();
  for (const item of server) byId.set(item.id, item);
  for (const item of local) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.id.localeCompare(a.id);
  });
}
