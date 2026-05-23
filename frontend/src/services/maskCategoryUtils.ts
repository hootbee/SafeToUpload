import type { MaskCategory, NormalizedBbox } from '../shared/types';

/** OwlViT·Gemma bbox 모두 없을 때 마스킹 UI용 기본 영역 (Phase 1 폴백) */
export const FALLBACK_BBOX_BY_CATEGORY: Record<MaskCategory, NormalizedBbox> = {
  face: { x: 0.28, y: 0.08, width: 0.44, height: 0.35 },
  license_plate: { x: 0.2, y: 0.7, width: 0.6, height: 0.15 },
  /** 아파트 현관·동호 간판이 보통 있는 하단 중앙 (상단 전체 띠 X) */
  building_sign: { x: 0.4, y: 0.7, width: 0.2, height: 0.07 },
};

export const MASK_CATEGORY_META: Record<
  MaskCategory,
  { label: string; aliases: string[]; owlQueries: string[] }
> = {
  face: {
    label: '얼굴',
    aliases: ['face', '얼굴', 'facial', 'human face', 'person'],
    owlQueries: ['human face', 'person face', 'selfie face', 'portrait face'],
  },
  license_plate: {
    label: '차량 번호판',
    aliases: ['license_plate', 'plate', '번호판', '차량', 'number plate', 'license plate'],
    owlQueries: [
      'license plate',
      'car number plate',
      'vehicle registration plate',
      'automobile license plate',
    ],
  },
  building_sign: {
    label: '건물 간판',
    aliases: ['building_sign', 'sign', '간판', '건물', 'store sign', 'shop sign'],
    owlQueries: ['store sign', 'building sign', 'shop signboard', 'billboard text', 'street sign'],
  },
};

/** OwlViT 열린 어휘 후보 (중복 제거) */
export const OPEN_VOCAB_QUERIES = Array.from(
  new Set(Object.values(MASK_CATEGORY_META).flatMap((m) => m.owlQueries)),
);

export function categoryDisplayLabel(category: MaskCategory) {
  return MASK_CATEGORY_META[category].label;
}

export function resolveMaskCategory(text: string): MaskCategory | null {
  const key = text.trim().toLowerCase();
  if (key === 'face' || key === 'license_plate' || key === 'building_sign') {
    return key;
  }
  for (const [category, meta] of Object.entries(MASK_CATEGORY_META) as Array<
    [MaskCategory, (typeof MASK_CATEGORY_META)[MaskCategory]]
  >) {
    if (meta.aliases.some((alias) => key === alias || key.includes(alias) || alias.includes(key))) {
      return category;
    }
  }
  return null;
}

export function extractCategoriesFromImageRisks(
  imageRisks: Array<Record<string, unknown>>,
): Set<MaskCategory> {
  const found = new Set<MaskCategory>();
  for (const item of imageRisks) {
    const type = String(item.type ?? '');
    const label = String(item.label ?? '');
    const category = resolveMaskCategory(type) ?? resolveMaskCategory(label);
    if (category) found.add(category);
  }
  return found;
}

/** 게시글·imageRisks에서 마스킹 탐지에 쓸 카테고리 힌트 (Gemma type 누락·visual 폴백 보완) */
export function inferMaskCategoriesFromContext(
  imageRisks: Array<Record<string, unknown>>,
  text = '',
): Set<MaskCategory> {
  const found = extractCategoriesFromImageRisks(imageRisks);
  const body = text.trim();
  if (!body) return found;

  if (/(아파트|빌라|오피스텔|동\s*\d+|호\s*\d+|번지|로\s*\d|길\s*\d|현관|출입|간판|호수)/i.test(body)) {
    found.add('building_sign');
  }
  if (/(차량|번호판|자동차|주차)/i.test(body)) {
    found.add('license_plate');
  }
  if (/(얼굴|셀카|인물|프로필)/i.test(body)) {
    found.add('face');
  }

  return found;
}

export function imageRiskSummaryForCategories(categories: Iterable<MaskCategory>) {
  const labels = [...categories].map(categoryDisplayLabel);
  if (labels.length === 0) return '이미지에서 마스킹 대상이 확인되지 않았습니다.';
  return labels.join(', ');
}
