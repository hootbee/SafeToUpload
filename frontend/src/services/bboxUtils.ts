import type { MaskCategory, NormalizedBbox } from '../shared/types';

export type PixelBox = { xmin: number; ymin: number; xmax: number; ymax: number };

export function parseNormalizedBbox(raw: unknown): NormalizedBbox | null {
  if (Array.isArray(raw) && raw.length >= 4) {
    const [x, y, width, height] = raw.map(Number);
    if ([x, y, width, height].some((n) => Number.isNaN(n))) return null;
    return {
      x: clamp01(x),
      y: clamp01(y),
      width: clamp01(width),
      height: clamp01(height),
    };
  }

  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const x = Number(b.x ?? b.left ?? b.xmin);
  const y = Number(b.y ?? b.top ?? b.ymin);
  const width = Number(b.width ?? b.w);
  const height = Number(b.height ?? b.h);
  const x2 = Number(b.xmax);
  const y2 = Number(b.ymax);

  if (![x, y].some((n) => Number.isNaN(n))) {
    if (!Number.isNaN(x2) && !Number.isNaN(y2) && (Number.isNaN(width) || Number.isNaN(height))) {
      return {
        x: clamp01(x),
        y: clamp01(y),
        width: clamp01(x2 - x),
        height: clamp01(y2 - y),
      };
    }
  }

  if ([x, y, width, height].some((n) => Number.isNaN(n))) return null;
  return {
    x: clamp01(x),
    y: clamp01(y),
    width: clamp01(width),
    height: clamp01(height),
  };
}

/** OwlViT 픽셀/정규화 혼용 방지 — 원본 이미지 크기 기준 0~1 */
export function pixelBoxToNormalized(
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
): NormalizedBbox {
  let { xmin, ymin, xmax, ymax } = box;

  const looksNormalized =
    xmax <= 1.5 && ymax <= 1.5 && xmin <= 1.5 && ymin <= 1.5 && imageWidth > 1 && imageHeight > 1;

  if (!looksNormalized) {
    xmin /= imageWidth;
    xmax /= imageWidth;
    ymin /= imageHeight;
    ymax /= imageHeight;
  }

  if (xmax < xmin) [xmin, xmax] = [xmax, xmin];
  if (ymax < ymin) [ymin, ymax] = [ymax, ymin];

  xmin = clamp01(xmin);
  ymin = clamp01(ymin);
  xmax = clamp01(xmax);
  ymax = clamp01(ymax);

  return {
    x: xmin,
    y: ymin,
    width: Math.max(0.01, xmax - xmin),
    height: Math.max(0.01, ymax - ymin),
  };
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Gemma가 0~100 퍼센트로 줄 때 0~1로 보정 */
export function normalizeBboxScale(bbox: NormalizedBbox): NormalizedBbox {
  if (bbox.x <= 1 && bbox.y <= 1 && bbox.width <= 1 && bbox.height <= 1) return bbox;
  const to01 = (v: number) => clamp01(v > 1 ? v / 100 : v);
  return {
    x: to01(bbox.x),
    y: to01(bbox.y),
    width: to01(bbox.width),
    height: to01(bbox.height),
  };
}

/** 0~1 범위·최소 크기 보장 — 화면 밖 좌표로 마스킹이 스킵되는 것 방지 */
export function sanitizeMaskBbox(bbox: NormalizedBbox): NormalizedBbox {
  let { x, y, width, height } = bbox;
  if (![x, y, width, height].every(Number.isFinite)) {
    return { x: 0.35, y: 0.65, width: 0.3, height: 0.12 };
  }
  width = Math.max(0.02, Math.min(1, width));
  height = Math.max(0.02, Math.min(1, height));
  x = Math.max(0, Math.min(1 - width, x));
  y = Math.max(0, Math.min(1 - height, y));
  return { x, y, width, height };
}

export function bboxToPixelRect(
  bbox: NormalizedBbox,
  imageWidth: number,
  imageHeight: number,
  paddingRatio = 0.02,
): { x: number; y: number; w: number; h: number } | null {
  const safe = sanitizeMaskBbox(bbox);
  const padX = safe.width * paddingRatio;
  const padY = safe.height * paddingRatio;
  const x = (safe.x - padX) * imageWidth;
  const y = (safe.y - padY) * imageHeight;
  const w = (safe.width + padX * 2) * imageWidth;
  const h = (safe.height + padY * 2) * imageHeight;

  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(y));
  const iw = Math.min(imageWidth - ix, Math.ceil(w));
  const ih = Math.min(imageHeight - iy, Math.ceil(h));

  if (iw < 8 || ih < 8) return null;
  return { x: ix, y: iy, w: iw, h: ih };
}

const DEFAULT_BBOX_LIMITS = { maxW: 0.82, maxH: 0.82 };

/** OwlViT·Gemma가 과하게 잡은 박스를 상한으로 축소 (type별 하드코딩 없음) */
export function tightenMaskBbox(
  bbox: NormalizedBbox,
  _categoryOrRiskType?: MaskCategory | string,
): NormalizedBbox {
  const limits = DEFAULT_BBOX_LIMITS;
  const { maxW, maxH } = limits;
  let { x, y, width, height } = bbox;
  const aspect = width / Math.max(0.0001, height);
  if (aspect > 12) width = Math.min(width, height * 12);
  if (aspect < 1 / 12) height = Math.min(height, width * 12);
  if (width <= maxW && height <= maxH) {
    return { x: clamp01(x), y: clamp01(y), width, height };
  }
  const cx = x + width / 2;
  const cy = y + height / 2;
  width = Math.min(width, maxW);
  height = Math.min(height, maxH);
  x = clamp01(cx - width / 2);
  y = clamp01(cy - height / 2);
  if (x + width > 1) x = clamp01(1 - width);
  if (y + height > 1) y = clamp01(1 - height);
  return { x, y, width, height };
}
