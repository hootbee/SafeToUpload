import { DETECT_MODEL_ID, DETECT_SCORE_THRESHOLD, HF_TOKEN } from '../config/models';
import type { ImageRiskItem } from '../../../shared/image-risk.types';
import type { MaskCategory, NormalizedBbox } from '../shared/types';
import { applyOrtWasmPaths } from './configureOrtWasm';
import { pixelBoxToNormalized, type PixelBox } from './bboxUtils';
import { MASK_CATEGORY_META, OPEN_VOCAB_QUERIES, resolveMaskCategory } from './maskCategoryUtils';

/** @deprecated category 기반 — RiskDetectionHit 사용 */
export interface DetectionHit {
  category: MaskCategory;
  bbox: NormalizedBbox;
  score: number;
  label: string;
}

export interface RiskDetectionHit {
  riskId: string;
  riskType: string;
  bbox: NormalizedBbox;
  score: number;
  label: string;
  category?: MaskCategory;
}

const MAX_OWL_RISKS_PER_RUN = 5;

type ZsodResult = Array<{
  score: number;
  label: string;
  box: PixelBox;
}>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZsodPipeline = (image: string, labels: string[], options?: Record<string, unknown>) => Promise<ZsodResult>;

let detectorPromise: Promise<ZsodPipeline> | null = null;

function configureDetectEnv(env: { allowLocalModels: boolean; useBrowserCache: boolean }) {
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  if (HF_TOKEN) {
    (env as { HF_TOKEN?: string }).HF_TOKEN = HF_TOKEN;
  }
}

export type DetectProgressCallback = (message: string, subPercent?: number) => void;

async function getDetector(onProgress?: DetectProgressCallback): Promise<ZsodPipeline> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      onProgress?.('탐지 모델 로드 중...');
      const { env, pipeline } = await import('@huggingface/transformers');
      applyOrtWasmPaths(env);
      configureDetectEnv(env);

      const detector = await pipeline('zero-shot-object-detection', DETECT_MODEL_ID, {
        device: 'wasm',
        progress_callback: (info: { status?: string; file?: string; progress?: number }) => {
          if (info.status === 'progress' || info.status === 'progress_total') {
            const pct = Math.round((info.progress ?? 0) * 100);
            onProgress?.(`탐지 모델 다운로드: ${info.file ?? 'loading'} (${pct}%)`, pct * 0.35);
          }
        },
      });
      return detector as ZsodPipeline;
    })();
  }
  return detectorPromise;
}

async function readImageSize(file: File) {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

/** Gemma가 준 label/type으로 OwlViT 쿼리 생성 (고정 type 테이블 없음) */
function queriesForRisk(risk: ImageRiskItem): string[] {
  const queries: string[] = [];
  const label = risk.label?.trim();
  const typePhrase = risk.type?.trim().replace(/_/g, ' ');

  if (label) {
    queries.push(label, `${label} in the image`, `${label} on photo`);
  }
  if (typePhrase && typePhrase !== label) {
    queries.push(typePhrase, `${typePhrase} in photo`);
  }
  if (queries.length > 0) return [...new Set(queries)].slice(0, 8);

  const category = resolveMaskCategory(risk.type);
  if (category) return MASK_CATEGORY_META[category].owlQueries;
  return OPEN_VOCAB_QUERIES.slice(0, 4);
}

async function runDetectionRaw(
  detector: ZsodPipeline,
  url: string,
  labels: string[],
): Promise<ZsodResult> {
  return detector(url, labels, {
    threshold: DETECT_SCORE_THRESHOLD,
    percentage: false,
    top_k: 12,
  });
}

function bestHitFromRaw(
  raw: ZsodResult,
  imageWidth: number,
  imageHeight: number,
  risk: ImageRiskItem,
  riskId: string,
): RiskDetectionHit | null {
  let best: RiskDetectionHit | null = null;

  const scoreForHit = (hit: RiskDetectionHit) => {
    const area = hit.bbox.width * hit.bbox.height;
    const aspect = hit.bbox.width / Math.max(0.0001, hit.bbox.height);
    const cx = hit.bbox.x + hit.bbox.width / 2;
    const cy = hit.bbox.y + hit.bbox.height / 2;
    const centerDist = Math.hypot(cx - 0.5, cy - 0.5);

    // bbox 클린업: 극단적으로 작은/큰 박스와 기괴한 종횡비를 감점.
    const areaPenalty = area < 0.0006 ? 0.22 : area > 0.85 ? 0.45 : 0;
    const aspectPenalty = aspect > 8 || aspect < 0.125 ? 0.18 : 0;
    const centerPenalty = centerDist > 0.72 ? 0.08 : 0;
    return hit.score - areaPenalty - aspectPenalty - centerPenalty;
  };

  for (const item of raw) {
    if (item.score < DETECT_SCORE_THRESHOLD) continue;
    const category = resolveMaskCategory(item.label) ?? resolveMaskCategory(risk.type);
    const hit: RiskDetectionHit = {
      riskId,
      riskType: risk.type,
      bbox: pixelBoxToNormalized(item.box, imageWidth, imageHeight),
      score: item.score,
      label: item.label,
      category: category ?? undefined,
    };
    const cleaned = hit.bbox.width * hit.bbox.height >= 0.0002;
    if (!cleaned) continue;
    if (!best || scoreForHit(hit) > scoreForHit(best)) best = hit;
  }
  return best;
}

/** bbox 없는 imageRisks 항목만 OwlViT 2차 탐지 */
export async function detectMaskRegionsForRisks(
  file: File,
  risks: ImageRiskItem[],
  riskIds: string[],
  onProgress?: DetectProgressCallback,
): Promise<RiskDetectionHit[]> {
  const needsOwl: Array<{ risk: ImageRiskItem; riskId: string }> = [];
  risks.forEach((risk, index) => {
    if (!risk.bbox && riskIds[index]) {
      needsOwl.push({ risk, riskId: riskIds[index] });
    }
  });

  if (needsOwl.length === 0) return [];

  const capped = needsOwl.slice(0, MAX_OWL_RISKS_PER_RUN);
  onProgress?.('마스킹용 OwlViT 탐지 모델 준비...', 5);
  const detector = await getDetector(onProgress);
  const { width, height } = await readImageSize(file);
  const url = URL.createObjectURL(file);

  const hits: RiskDetectionHit[] = [];

  try {
    for (let i = 0; i < capped.length; i += 1) {
      const { risk, riskId } = capped[i];
      onProgress?.(`OwlViT: ${risk.label} (${i + 1}/${capped.length})`, 55 + i * 8);
      const labels = queriesForRisk(risk);
      const raw = await runDetectionRaw(detector, url, labels);
      const hit = bestHitFromRaw(raw, width, height, risk, riskId);
      if (hit) hits.push(hit);
    }
    onProgress?.(`항목별 탐지 완료 — ${hits.length}건`, 92);
  } finally {
    URL.revokeObjectURL(url);
  }

  return hits;
}

/** @deprecated detectMaskRegionsForRisks 사용 */
export async function detectMaskRegionsFromFile(
  file: File,
  onProgress?: DetectProgressCallback,
  _gemmaCategories?: Set<MaskCategory>,
): Promise<DetectionHit[]> {
  onProgress?.('마스킹용 OwlViT 탐지 모델 준비...', 5);
  const detector = await getDetector(onProgress);
  const { width, height } = await readImageSize(file);
  const url = URL.createObjectURL(file);

  try {
    const raw = await runDetectionRaw(detector, url, OPEN_VOCAB_QUERIES);
    const byCategory = new Map<MaskCategory, DetectionHit[]>();
    for (const item of raw) {
      const category = resolveMaskCategory(item.label);
      if (!category || item.score < DETECT_SCORE_THRESHOLD) continue;
      const hit: DetectionHit = {
        category,
        bbox: pixelBoxToNormalized(item.box, width, height),
        score: item.score,
        label: item.label,
      };
      const list = byCategory.get(category) ?? [];
      list.push(hit);
      byCategory.set(category, list);
    }
    const merged: DetectionHit[] = [];
    for (const catHits of byCategory.values()) {
      merged.push(catHits.reduce((a, b) => (a.score >= b.score ? a : b)));
    }
    return merged;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function groupDetectionsByCategory(hits: DetectionHit[]): Map<MaskCategory, DetectionHit> {
  const map = new Map<MaskCategory, DetectionHit>();
  for (const hit of hits) {
    const prev = map.get(hit.category);
    if (!prev || hit.score > prev.score) {
      map.set(hit.category, hit);
    }
  }
  return map;
}

export function disposeDetectionModel() {
  detectorPromise = null;
}
