import { resolveMaskRenderParams, type MaskRenderOptions } from '../config/maskRenderSettings';
import type { ImageRiskItem } from '../../../shared/image-risk.types';
import type { AiAnalysisResponse } from '../shared/aiTypes';
import type {
  MaskDetectionTrace,
  MaskRegion,
  MaskRegionSource,
  MaskTraceEntry,
  NormalizedBbox,
  RiskReportData,
} from '../shared/types';
import type { RiskDetectionHit } from './imageDetectService';
import {
  bboxToPixelRect,
  normalizeBboxScale,
  parseNormalizedBbox,
  sanitizeMaskBbox,
  tightenMaskBbox,
} from './bboxUtils';
import { parseImageRiskItems } from './imageRiskHeuristics';
import { riskTypeToMaskCategory } from './maskCategoryUtils';

export interface MaskRegionsBuildResult {
  regions: MaskRegion[];
  riskCount: number;
  skippedRegionIds: string[];
  skippedLabels: string[];
  /** bbox 없어 마스킹 영역을 만들지 못한 항목 (Gemma는 반환함) */
  unlocatedLabels: string[];
  detectionTrace: MaskDetectionTrace;
}

function displayLabel(risk: ImageRiskItem): string {
  return risk.label?.trim() || risk.type?.trim() || '항목';
}

function traceEntry(
  stage: MaskTraceEntry['stage'],
  type: string,
  label: string,
  detail: string,
): MaskTraceEntry {
  return { stage, type, label, detail };
}

function snapshotGemmaRisks(ai: AiAnalysisResponse): MaskTraceEntry[] {
  const raw = Array.isArray(ai.imageRisks) ? ai.imageRisks : [];
  if (raw.length === 0) {
    return [traceEntry('gemma', '—', '—', '항목 없음 (빈 배열 또는 파싱 실패)')];
  }
  return raw.map((item) => {
    const type = String(item.type ?? '');
    const label = String(item.label ?? item.type ?? '—');
    const hasBbox = Boolean(item.bbox && typeof item.bbox === 'object');
    return traceEntry('gemma', type || '—', label, hasBbox ? 'bbox 있음' : 'bbox 없음');
  });
}

export function riskRegionId(type: string, index: number) {
  return `mask-${type.replace(/[^a-zA-Z0-9_]+/g, '_')}-${index}`;
}

/** 사용자가 직접 그린 마스킹 영역 */
export function createUserMaskRegion(bbox: NormalizedBbox): MaskRegion {
  return {
    id: `user-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    riskType: 'user_manual',
    label: '사용자 지정',
    bbox: sanitizeMaskBbox(bbox),
    checked: true,
    source: 'user',
  };
}

export function reportHasUserManualMaskRegions(report: RiskReportData): boolean {
  if (report.maskRegions.some((r) => r.source === 'user')) return true;
  return (report.imageEntries ?? []).some((entry) => entry.maskRegions.some((r) => r.source === 'user'));
}

/** blob 마스킹 미리보기 URL 해제 */
export function revokeMaskedPreviewUrls(report: RiskReportData): void {
  const revoke = (url?: string) => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  };
  revoke(report.maskedImagePreviewUrl);
  for (const entry of report.imageEntries ?? []) {
    revoke(entry.maskedImagePreviewUrl);
  }
}

/** 직접 수정(source: user) 영역·미리보기 제거 */
export function stripUserManualMaskRegions(report: RiskReportData): RiskReportData {
  const keepAutoRegions = (regions: MaskRegion[]) => regions.filter((r) => r.source !== 'user');

  const imageEntries = report.imageEntries?.map((entry) => ({
    ...entry,
    maskRegions: keepAutoRegions(entry.maskRegions),
    maskedImagePreviewUrl: undefined,
  }));

  return {
    ...report,
    maskRegions: keepAutoRegions(report.maskRegions),
    imageEntries,
    maskedImagePreviewUrl: undefined,
  };
}

/** Gemma imageRisks 그대로 사용 (항목 추가·삭제·타입 변환 없음) */
export function prepareImageRisksItems(ai: AiAnalysisResponse): ImageRiskItem[] {
  return parseImageRiskItems(ai.imageRisks as Array<Record<string, unknown>>);
}

export function imageRiskRegionIds(items: ImageRiskItem[]): string[] {
  return items.map((risk, index) => riskRegionId(risk.type, index));
}

function resolveRiskBbox(
  risk: ImageRiskItem,
  detectionsByRiskId: Map<string, RiskDetectionHit>,
  riskId: string,
): { bbox: NormalizedBbox; source: MaskRegionSource; confidence?: number } | null {
  const fromGemma = risk.bbox ? parseNormalizedBbox(risk.bbox) : null;
  if (fromGemma) {
    return { bbox: fromGemma, source: 'gemma' };
  }

  const fromOwl = detectionsByRiskId.get(riskId);
  if (fromOwl) {
    return { bbox: fromOwl.bbox, source: 'owl', confidence: fromOwl.score };
  }

  return null;
}

/** imageRisks 항목마다 MaskRegion 1개 (bbox 있을 때만) */
export function buildMaskRegionsFromRisks(
  ai: AiAnalysisResponse,
  hasImage: boolean,
  detections: RiskDetectionHit[] = [],
  _inputText = '',
  _imageName?: string,
): MaskRegionsBuildResult {
  const emptyTrace: MaskDetectionTrace = {
    gemmaCount: 0,
    preparedCount: 0,
    owlCount: 0,
    regionCount: 0,
    entries: [],
  };

  if (!hasImage) {
    return {
      regions: [],
      riskCount: 0,
      skippedRegionIds: [],
      skippedLabels: [],
      unlocatedLabels: [],
      detectionTrace: emptyTrace,
    };
  }

  const traceEntries: MaskTraceEntry[] = [...snapshotGemmaRisks(ai)];
  const gemmaCount = traceEntries.filter((e) => e.stage === 'gemma' && e.type !== '—').length;

  const items = prepareImageRisksItems(ai);

  for (const risk of items) {
    traceEntries.push(
      traceEntry(
        'expand',
        risk.type,
        displayLabel(risk),
        risk.bbox ? '항목 유지 · bbox 있음' : '항목 유지 · bbox 없음 (OwlViT 시도)',
      ),
    );
  }

  const detectionsByRiskId = new Map<string, RiskDetectionHit>();
  for (const hit of detections) {
    if (hit.riskId) detectionsByRiskId.set(hit.riskId, hit);
    traceEntries.push(
      traceEntry(
        'owl',
        hit.riskType,
        hit.label,
        `신뢰도 ${Math.round(hit.score * 100)}% · id=${hit.riskId}`,
      ),
    );
  }

  const regions: MaskRegion[] = [];
  const skippedRegionIds: string[] = [];
  const skippedLabels: string[] = [];
  const unlocatedLabels: string[] = [];

  items.forEach((risk, index) => {
    const id = riskRegionId(risk.type, index);
    const resolved = resolveRiskBbox(risk, detectionsByRiskId, id);
    if (!resolved) {
      unlocatedLabels.push(displayLabel(risk));
      traceEntries.push(
        traceEntry('region', risk.type, displayLabel(risk), 'bbox 없음 — 마스킹 영역 미생성'),
      );
      return;
    }

    const rawBbox = normalizeBboxScale(resolved.bbox);
    const bbox = sanitizeMaskBbox(tightenMaskBbox(rawBbox, risk.type));

    const sourceLabel =
      resolved.source === 'gemma'
        ? 'Gemma bbox'
        : `OwlViT${resolved.confidence != null ? ` ${Math.round(resolved.confidence * 100)}%` : ''}`;

    traceEntries.push(
      traceEntry(
        'region',
        risk.type,
        displayLabel(risk),
        `마스킹 영역 생성 · ${sourceLabel}`,
      ),
    );

    regions.push({
      id,
      riskType: risk.type,
      category: riskTypeToMaskCategory(risk.type),
      label: displayLabel(risk),
      bbox,
      confidence: resolved.confidence,
      checked: risk.defaultChecked !== false,
      source: resolved.source,
    });
  });

  const detectionTrace: MaskDetectionTrace = {
    gemmaCount,
    preparedCount: items.length,
    owlCount: detections.length,
    regionCount: regions.length,
    entries: traceEntries,
  };

  return {
    regions,
    riskCount: items.length,
    skippedRegionIds,
    skippedLabels,
    unlocatedLabels,
    detectionTrace,
  };
}

/** @deprecated buildMaskRegionsFromRisks 사용 */
export function buildMaskRegions(
  ai: AiAnalysisResponse,
  hasImage: boolean,
  detections: RiskDetectionHit[] = [],
  inputText = '',
  imageName?: string,
): MaskRegionsBuildResult {
  return buildMaskRegionsFromRisks(ai, hasImage, detections, inputText, imageName);
}

export function buildDynamicImageRiskSummary(result: MaskRegionsBuildResult) {
  if (result.regions.length > 0) {
    const normalizeLabelKey = (label: string) => label.trim().toLowerCase();
    const labels = result.regions.map((r) => r.label);
    const totalByLabel = new Map<string, number>();
    for (const label of labels) {
      const key = normalizeLabelKey(label);
      totalByLabel.set(key, (totalByLabel.get(key) ?? 0) + 1);
    }
    const seenByLabel = new Map<string, number>();
    const numberedLabels = labels.map((label) => {
      const key = normalizeLabelKey(label);
      const total = totalByLabel.get(key) ?? 0;
      const seen = (seenByLabel.get(key) ?? 0) + 1;
      seenByLabel.set(key, seen);
      return total > 1 ? `${label}${seen}` : label;
    });
    return `마스킹 후보: ${numberedLabels.join(', ')}`;
  }
  if (result.unlocatedLabels.length > 0) {
    return `항목은 확인됐으나 bbox가 없습니다 (${result.unlocatedLabels.join(', ')}).`;
  }
  return '이미지에서 마스킹 후보가 없습니다.';
}

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

async function loadImageFromFile(file: File): Promise<LoadedImage> {
  const bitmap = await createImageBitmap(file);
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    cleanup: () => bitmap.close(),
  };
}

function blockPixelateImageData(
  imageData: ImageData,
  maxBlock: number,
  round: number,
  totalRounds: number,
) {
  const { data, width, height } = imageData;
  const growth = 1 + round / Math.max(totalRounds, 1);
  const block = Math.max(
    1,
    Math.min(maxBlock * growth, Math.floor(Math.min(width, height) / 4)),
  );
  for (let y = 0; y < height; y += block) {
    for (let x = 0; x < width; x += block) {
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let dy = 0; dy < block && y + dy < height; dy += 1) {
        for (let dx = 0; dx < block && x + dx < width; dx += 1) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        }
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      for (let dy = 0; dy < block && y + dy < height; dy += 1) {
        for (let dx = 0; dx < block && x + dx < width; dx += 1) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }
    }
  }
}

/** 다운스케일 후 nearest-neighbor 업스케일 — 깔끔한 모자이크 */
function applyMosaicRectOnMainCanvas(
  ctx: CanvasRenderingContext2D,
  ix: number,
  iy: number,
  iw: number,
  ih: number,
  cellPx: number,
) {
  const cell = Math.max(4, Math.min(cellPx, Math.floor(Math.min(iw, ih) / 2)));
  const cols = Math.max(1, Math.round(iw / cell));
  const rows = Math.max(1, Math.round(ih / cell));
  const small = document.createElement('canvas');
  small.width = cols;
  small.height = rows;
  const sctx = small.getContext('2d');
  if (!sctx) return;
  sctx.drawImage(ctx.canvas, ix, iy, iw, ih, 0, 0, cols, rows);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, cols, rows, ix, iy, iw, ih);
  ctx.restore();
}

function obliterateRectOnMainCanvas(
  ctx: CanvasRenderingContext2D,
  ix: number,
  iy: number,
  iw: number,
  ih: number,
  blurRadius: number,
  blurPasses: number,
  pixelateMaxPx: number,
  pixelateRounds: number,
) {
  for (let pass = 0; pass < blurPasses; pass += 1) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.clip();
    ctx.filter = `blur(${blurRadius}px)`;
    ctx.drawImage(ctx.canvas, ix, iy, iw, ih, ix, iy, iw, ih);
    ctx.restore();
  }

  for (let round = 0; round < pixelateRounds; round += 1) {
    try {
      const imageData = ctx.getImageData(ix, iy, iw, ih);
      blockPixelateImageData(imageData, pixelateMaxPx, round, pixelateRounds);
      ctx.putImageData(imageData, ix, iy);
    } catch {
      ctx.save();
      ctx.fillStyle = '#7a7a7a';
      ctx.fillRect(ix, iy, iw, ih);
      ctx.restore();
      return;
    }
  }
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
  options?: MaskRenderOptions,
): Promise<Blob> {
  const selected = regions.filter((r) => r.checked);
  if (selected.length === 0) {
    throw new Error('마스킹할 항목을 하나 이상 선택하세요.');
  }

  const render = resolveMaskRenderParams(options);
  const useMosaic = render.style === 'mosaic';
  const featherRatio = Math.max(0.06, render.featherPx / 400);

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
  const padRatio = render.paddingRatio;

  for (const region of selected) {
    const rect = bboxToPixelRect(region.bbox, width, height, padRatio);
    if (!rect) continue;

    if (useMosaic) {
      applyMosaicRectOnMainCanvas(ctx, rect.x, rect.y, rect.w, rect.h, render.mosaicCellPx);
    } else {
      const expanded = expandPixelRect(rect, width, height, featherRatio);
      obliterateRectOnMainCanvas(
        ctx,
        expanded.x,
        expanded.y,
        expanded.w,
        expanded.h,
        render.blurRadius,
        render.blurPasses,
        render.pixelateMaxPx,
        render.pixelateRounds,
      );
    }
    applied += 1;
  }

  if (applied === 0) {
    throw new Error('유효한 마스킹 영역이 없습니다. bbox를 확인하세요.');
  }

  if (!useMosaic && render.overlayOpacity > 0) {
    for (const region of selected) {
      const rect = bboxToPixelRect(region.bbox, width, height, padRatio);
      if (!rect) continue;
      ctx.save();
      ctx.fillStyle = `rgba(120,120,120,${render.overlayOpacity})`;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('마스킹 결과 이미지 생성에 실패했습니다.'));
    }, 'image/png');
  });
}

export function suggestedMaskedFileName(originalName: string) {
  const base = originalName.replace(/\.[^.]+$/, '');
  return `${base}-masked.png`;
}
