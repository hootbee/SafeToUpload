import { MASK_FEATHER_PX, MASK_OVERLAY_OPACITY, MASK_PIXELATE_ROUNDS } from '../config/models';
import type { AiAnalysisResponse } from '../shared/aiTypes';
import type { MaskCategory, MaskRegion } from '../shared/types';
import type { DetectionHit } from './imageDetectService';
import { groupDetectionsByCategory } from './imageDetectService';
import {
  bboxToPixelRect,
  normalizeBboxScale,
  parseNormalizedBbox,
  sanitizeMaskBbox,
  tightenMaskBbox,
} from './bboxUtils';
import {
  categoryDisplayLabel,
  extractCategoriesFromImageRisks,
  FALLBACK_BBOX_BY_CATEGORY,
  imageRiskSummaryForCategories,
  inferMaskCategoriesFromContext,
  resolveMaskCategory,
} from './maskCategoryUtils';

export interface MaskRegionsBuildResult {
  regions: MaskRegion[];
  gemmaCategories: MaskCategory[];
  detectedCategories: MaskCategory[];
  unionCategories: MaskCategory[];
  skippedCategories: MaskCategory[];
}

export function buildMaskRegions(
  ai: AiAnalysisResponse,
  hasImage: boolean,
  detections: DetectionHit[] = [],
  inputText = '',
): MaskRegionsBuildResult {
  if (!hasImage) {
    return {
      regions: [],
      gemmaCategories: [],
      detectedCategories: [],
      unionCategories: [],
      skippedCategories: [],
    };
  }

  const gemmaSet = extractCategoriesFromImageRisks(ai.imageRisks);
  const hintSet = inferMaskCategoriesFromContext(ai.imageRisks, inputText);
  const detectedByCategory = groupDetectionsByCategory(detections);
  const detectedSet = new Set(detectedByCategory.keys());

  const unionSet = new Set<MaskCategory>([...gemmaSet, ...hintSet, ...detectedSet]);
  const unionCategories = [...unionSet];
  const skippedCategories: MaskCategory[] = [];
  const regions: MaskRegion[] = [];

  for (const category of unionCategories) {
    const fromDetect = detectedByCategory.get(category);
    const gemmaItem = findImageRiskItem(ai.imageRisks, category);
    const fromGemmaBbox = gemmaItem ? parseNormalizedBbox(gemmaItem.bbox) : null;
    const resolvedBbox = fromDetect?.bbox ?? fromGemmaBbox;
    const allowFallback =
      !resolvedBbox &&
      (gemmaSet.has(category) || hintSet.has(category) || detectedSet.has(category));

    if (!resolvedBbox && !allowFallback) {
      continue;
    }

    const usedFallback = !resolvedBbox;
    const rawBbox = normalizeBboxScale(resolvedBbox ?? FALLBACK_BBOX_BY_CATEGORY[category]);
    const bbox = sanitizeMaskBbox(tightenMaskBbox(rawBbox, category));

    if (usedFallback) {
      skippedCategories.push(category);
    }

    regions.push({
      id: `mask-${category}`,
      category,
      label: String(gemmaItem?.label ?? categoryDisplayLabel(category)),
      bbox,
      confidence: fromDetect?.score,
      checked: true,
      source: fromDetect || fromGemmaBbox ? 'auto' : 'fallback',
    });
  }

  if (regions.length === 0) {
    const category: MaskCategory = hintSet.has('face')
      ? 'face'
      : hintSet.has('license_plate')
        ? 'license_plate'
        : 'building_sign';
    skippedCategories.push(category);
    regions.push({
      id: `mask-${category}`,
      category,
      label: categoryDisplayLabel(category),
      bbox: sanitizeMaskBbox(FALLBACK_BBOX_BY_CATEGORY[category]),
      checked: true,
      source: 'fallback',
    });
  }

  return {
    regions,
    gemmaCategories: [...gemmaSet],
    detectedCategories: [...detectedSet],
    unionCategories: unionCategories.length > 0 ? unionCategories : regions.map((r) => r.category),
    skippedCategories,
  };
}

export function buildDynamicImageRiskSummary(result: MaskRegionsBuildResult) {
  if (result.regions.length > 0) {
    const labels = result.regions.map((r) => r.label);
    return `마스킹 후보: ${labels.join(', ')}`;
  }
  if (result.unionCategories.length > 0 && result.skippedCategories.length > 0) {
    return `위험 유형은 확인됐으나 정확한 영역을 찾지 못했습니다 (${imageRiskSummaryForCategories(result.skippedCategories)}).`;
  }
  return '이미지에서 마스킹 후보가 없습니다.';
}

function findImageRiskItem(imageRisks: Array<Record<string, unknown>>, category: MaskCategory) {
  for (const item of imageRisks) {
    const type = String(item.type ?? '');
    const label = String(item.label ?? '');
    if (resolveMaskCategory(type) === category || resolveMaskCategory(label) === category) {
      return item;
    }
  }
  return null;
}

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

async function loadImageFromFile(file: File): Promise<LoadedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  }
}

/** 블록 평균색 — 픽셀을 직접 덮어써서 가독 불가 */
function blockPixelateImageData(imageData: ImageData, blockSize: number) {
  const { width: w, height: h, data: d } = imageData;
  const block = Math.max(4, blockSize);

  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      const yEnd = Math.min(by + block, h);
      const xEnd = Math.min(bx + block, w);
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;

      for (let py = by; py < yEnd; py += 1) {
        for (let px = bx; px < xEnd; px += 1) {
          const i = (py * w + px) * 4;
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
          n += 1;
        }
      }
      if (n === 0) continue;

      r = Math.round(r / n);
      g = Math.round(g / n);
      b = Math.round(b / n);

      for (let py = by; py < yEnd; py += 1) {
        for (let px = bx; px < xEnd; px += 1) {
          const i = (py * w + px) * 4;
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
    }
  }
}

/**
 * 이미 그려진 메인 캔버스 픽셀을 직접 수정 (오프스크린 합성·filter 없음).
 * Chrome 확장에서 가장 안정적으로 동작함.
 */
function obliterateRectOnMainCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rounds: number,
): boolean {
  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(y));
  const iw = Math.min(canvasWidth - ix, Math.max(1, Math.ceil(w)));
  const ih = Math.min(canvasHeight - iy, Math.max(1, Math.ceil(h)));

  if (iw < 4 || ih < 4) return false;

  const blockSize = Math.max(6, Math.min(20, Math.floor(Math.min(iw, ih) / 5)));

  for (let round = 0; round < rounds; round += 1) {
    try {
      const imageData = ctx.getImageData(ix, iy, iw, ih);
      blockPixelateImageData(imageData, blockSize);
      ctx.putImageData(imageData, ix, iy);
    } catch {
      ctx.save();
      ctx.fillStyle = '#7a7a7a';
      ctx.fillRect(ix, iy, iw, ih);
      ctx.restore();
      return true;
    }
  }

  return true;
}

function expandPixelRect(
  rect: { x: number; y: number; w: number; h: number },
  canvasWidth: number,
  canvasHeight: number,
  ratio: number,
) {
  const padX = rect.w * ratio;
  const padY = rect.h * ratio;
  const x = Math.max(0, Math.floor(rect.x - padX));
  const y = Math.max(0, Math.floor(rect.y - padY));
  const w = Math.min(canvasWidth - x, Math.ceil(rect.w + padX * 2));
  const h = Math.min(canvasHeight - y, Math.ceil(rect.h + padY * 2));
  return { x, y, w, h };
}

export async function applyMasksToFile(
  file: File,
  regions: MaskRegion[],
  options?: {
    blurRadius?: number;
    blurPasses?: number;
    pixelateMaxPx?: number;
    overlayOpacity?: number;
    padding?: number;
  },
): Promise<Blob> {
  const selected = regions.filter((r) => r.checked);
  if (selected.length === 0) {
    throw new Error('마스킹할 항목을 하나 이상 선택하세요.');
  }

  const pixelateRounds = MASK_PIXELATE_ROUNDS;
  const featherRatio = Math.max(0.06, MASK_FEATHER_PX / 400);

  const paddingByCategory: Record<MaskCategory, number> = {
    face: 0.04,
    license_plate: 0.03,
    building_sign: 0.02,
  };

  const loaded = await loadImageFromFile(file);
  const { source, width, height } = loaded;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  if (!ctx) {
    loaded.cleanup();
    throw new Error('Canvas를 사용할 수 없습니다.');
  }

  ctx.drawImage(source, 0, 0, width, height);
  loaded.cleanup();

  let applied = 0;
  for (const region of selected) {
    const padRatio = paddingByCategory[region.category] ?? options?.padding ?? 0.02;
    const rect = bboxToPixelRect(region.bbox, width, height, padRatio);
    if (!rect) continue;

    const expanded = expandPixelRect(rect, width, height, featherRatio);
    const ok = obliterateRectOnMainCanvas(
      ctx,
      width,
      height,
      expanded.x,
      expanded.y,
      expanded.w,
      expanded.h,
      pixelateRounds,
    );
    if (ok) applied += 1;
  }

  if (applied === 0) {
    throw new Error(
      '마스킹 영역을 이미지 위에 그리지 못했습니다. 분석을 다시 실행하거나 항목을 확인해 주세요.',
    );
  }

  if ((options?.overlayOpacity ?? MASK_OVERLAY_OPACITY) > 0) {
    for (const region of selected) {
      const rect = bboxToPixelRect(region.bbox, width, height, 0.02);
      if (!rect) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, options?.overlayOpacity ?? MASK_OVERLAY_OPACITY);
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  if (!blob) throw new Error('마스킹 이미지를 생성하지 못했습니다.');
  return blob;
}

export function suggestedMaskedFileName(originalName?: string) {
  const base = originalName?.replace(/\.[^.]+$/, '') ?? 'image';
  return `${base}-masked.png`;
}
