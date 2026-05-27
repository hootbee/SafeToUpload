/** 이미지 대비 0~1 정규화 bbox */
export interface ImageRiskBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** LLM imageRisks 항목 (마스킹 UI 1:1 대응) */
export interface ImageRiskItem {
  type: string;
  label: string;
  severity?: string;
  description?: string;
  bbox?: ImageRiskBbox;
  parentType?: string;
  maskGroup?: string;
  /** id_card_full 등 기본 체크 해제 */
  defaultChecked?: boolean;
}

export const ID_CARD_SUB_TYPES = [
  'id_card_face',
  'id_card_name',
  'id_card_rrn',
  'id_card_address',
  'id_card_full',
] as const;

export type IdCardSubType = (typeof ID_CARD_SUB_TYPES)[number];

export function isIdCardType(type: string): boolean {
  const t = type.toLowerCase();
  return (
    t === 'id_card' ||
    t === 'id_card_like' ||
    t.startsWith('id_card_') ||
    /신분|주민|여권|등록증|passport|identity_card|government_id/.test(t)
  );
}

export function normalizeImageRiskItem(raw: Record<string, unknown>): ImageRiskItem | null {
  const type = String(raw.type ?? '').trim();
  const label = String(raw.label ?? raw.type ?? '').trim();
  if (!type && !label) return null;
  return {
    type: type || label,
    label: label || type,
    severity: raw.severity != null ? String(raw.severity) : undefined,
    description: raw.description != null ? String(raw.description) : undefined,
    bbox: raw.bbox as ImageRiskBbox | undefined,
    parentType: raw.parentType != null ? String(raw.parentType) : undefined,
    maskGroup: raw.maskGroup != null ? String(raw.maskGroup) : undefined,
    defaultChecked: typeof raw.defaultChecked === 'boolean' ? raw.defaultChecked : undefined,
  };
}

export function toImageRiskRecords(items: ImageRiskItem[]): Array<Record<string, unknown>> {
  return items.map((item) => ({ ...item }));
}
