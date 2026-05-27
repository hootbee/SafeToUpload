import { API_BASE_URL } from '../config/models';
import type {
  AnalysisRecordResponse,
  CreateAnalysisPayload,
  HistoryRecordDto,
  ServerLlmConfigPayload,
  SettingsDto,
} from '../shared/aiTypes';
import type { InferenceMode, Platform } from '../shared/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    const reason = (error as Error).message || 'network error';
    throw new Error(
      `백엔드에 연결할 수 없습니다 (${reason}). API: ${API_BASE_URL} — server에서 npm run start:dev 실행 및 manifest host_permissions를 확인하세요.`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `HTTP ${response.status} (${url})`);
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

/** 서버 분석용 이미지 업로드 (Open WebUI 멀티모달 전송 전제) */
export async function uploadAnalysisImage(analysisId: string, file: File) {
  const url = `${API_BASE_URL}/analysis/${analysisId}/image`;
  const form = new FormData();
  form.append('image', file, file.name);

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', body: form });
  } catch (error) {
    const reason = (error as Error).message || 'network error';
    throw new Error(`이미지 업로드 실패 (${reason}). API: ${API_BASE_URL}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 404) {
      throw new Error(
        '이미지 업로드 API를 찾을 수 없습니다(404). server에서 npm run start:dev를 재시작했는지 확인하세요. ' +
          '로그에 Mapped {/analysis/:id/image, POST} 가 있어야 합니다.',
      );
    }
    throw new Error(body || `HTTP ${response.status} (image upload)`);
  }

  return response.json() as Promise<{ id: string; storedImage: string; message: string }>;
}

export async function runAnalysis(id: string, llm?: ServerLlmConfigPayload) {
  const body =
    llm && (llm.chatUrl || llm.apiKey || llm.model)
      ? JSON.stringify({
          llm: {
            ...(llm.chatUrl ? { chatUrl: llm.chatUrl } : {}),
            ...(llm.apiKey ? { apiKey: llm.apiKey } : {}),
            ...(llm.model ? { model: llm.model } : {}),
          },
        })
      : undefined;

  return request<{
    id: string;
    status: string;
    riskScore: number | null;
    riskLevel: string | null;
    summary: string | null;
    piiTypes: string[];
    piiCount: number;
  }>(`/analysis/${id}/run`, {
    method: 'POST',
    ...(body ? { body } : {}),
  });
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

export async function fetchPrivacyMemory() {
  return request<
    Array<{
      id: string;
      piiTypes: string[];
      contextTags: string[];
      riskyCombinations: string[];
      seenCount: number;
      lastSeenAt: string;
      lastRiskLevel?: string | null;
    }>
  >('/privacy-memory');
}

export async function deleteAllPrivacyMemory() {
  return request<{ message: string; deletedCount: number }>('/privacy-memory', {
    method: 'DELETE',
  });
}

export async function updatePrivacyMemorySettings(payload: {
  privacyMemoryEnabled?: boolean;
  privacyMemoryRetentionDays?: number;
  privacyMemoryUseForBlocking?: boolean;
  privacyMemoryUseForScoreBoost?: boolean;
}) {
  return request<SettingsDto>('/settings/privacy-memory', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
