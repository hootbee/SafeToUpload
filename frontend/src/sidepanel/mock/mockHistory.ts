import type { HistoryItem } from '../../shared/types';

export const initialHistory: HistoryItem[] = [
  {
    id: 'h-1',
    date: '2026-05-17',
    platform: 'instagram',
    riskLevel: 'high',
    summary: '전화번호와 주소가 포함된 게시글 초안',
    riskScore: 78,
  },
  {
    id: 'h-2',
    date: '2026-05-16',
    platform: 'x',
    riskLevel: 'medium',
    summary: '출장 일정과 위치 정보 노출 가능성',
    riskScore: 52,
  },
  {
    id: 'h-3',
    date: '2026-05-15',
    platform: 'facebook',
    riskLevel: 'low',
    summary: '일반 후기 게시글, 민감정보 낮음',
    riskScore: 18,
  },
];
