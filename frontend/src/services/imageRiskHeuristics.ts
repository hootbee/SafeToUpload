import type { ImageRiskItem } from '../../../shared/image-risk.types';
import { normalizeImageRiskItem } from '../../../shared/image-risk.types';

/** LLM imageRisks JSON → 항목 배열 (필터·추가 없음) */
export function parseImageRiskItems(risks: Array<Record<string, unknown>>): ImageRiskItem[] {
  const items: ImageRiskItem[] = [];
  for (const raw of risks) {
    const item = normalizeImageRiskItem(raw);
    if (item) items.push(item);
  }
  return items;
}

/** @deprecated parseImageRiskItems 사용 — 하위 호환 alias */
export function sanitizeImageRisks(
  risks: Array<Record<string, unknown>>,
  _opts?: { imageName?: string; text?: string },
): ImageRiskItem[] {
  return parseImageRiskItems(risks);
}
