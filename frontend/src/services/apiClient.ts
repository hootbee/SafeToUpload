import { API_BASE_URL } from '../config/models';
import type {
  AnalysisRecordResponse,
  CreateAnalysisPayload,
  HistoryRecordDto,
  SettingsDto,
} from '../shared/aiTypes';
import type { InferenceMode, Platform } from '../shared/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function checkHealth() {
  return request<{ status?: string; appMode?: string }>('/health');
}

export async function createAnalysis(payload: CreateAnalysisPayload) {
  return request<{ id: string; status: string }>('/analysis', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function runAnalysis(id: string) {
  return request<{
    id: string;
    status: string;
    riskScore: number | null;
    riskLevel: string | null;
    summary: string | null;
    piiTypes: string[];
    piiCount: number;
  }>(`/analysis/${id}/run`, { method: 'POST' });
}

export async function getAnalysis(id: string) {
  return request<AnalysisRecordResponse>(`/analysis/${id}`);
}

export async function cancelAnalysis(id: string) {
  return request<{ id: string; status: string }>(`/analysis/${id}/cancel`, { method: 'PATCH' });
}

export async function fetchHistory(params?: { platform?: Platform; riskLevel?: string }) {
  const query = new URLSearchParams();
  if (params?.platform) query.set('platform', params.platform);
  if (params?.riskLevel) query.set('riskLevel', params.riskLevel);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<HistoryRecordDto[]>(`/history${suffix}`);
}

export async function deleteAllHistory() {
  return request<{ message: string }>('/history', { method: 'DELETE' });
}

export async function fetchSettings() {
  return request<SettingsDto>('/settings');
}

export async function updateSettings(payload: {
  targetPlatforms: Platform[];
  inferenceMode: InferenceMode;
  sensitivity: number;
  retentionDays: number;
  notificationEnabled: boolean;
}) {
  return request<SettingsDto>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
