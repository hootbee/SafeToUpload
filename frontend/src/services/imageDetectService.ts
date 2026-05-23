import { DETECT_MODEL_ID, DETECT_SCORE_THRESHOLD, HF_TOKEN } from '../config/models';
import type { MaskCategory, NormalizedBbox } from '../shared/types';
import { applyOrtWasmPaths } from './configureOrtWasm';
import { pixelBoxToNormalized, type PixelBox } from './bboxUtils';
import { MASK_CATEGORY_META, OPEN_VOCAB_QUERIES, resolveMaskCategory } from './maskCategoryUtils';

export interface DetectionHit {
  category: MaskCategory;
  bbox: NormalizedBbox;
  score: number;
  label: string;
}

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

async function runDetection(
  detector: ZsodPipeline,
  url: string,
  labels: string[],
  imageWidth: number,
  imageHeight: number,
): Promise<DetectionHit[]> {
  const raw = await detector(url, labels, {
    threshold: DETECT_SCORE_THRESHOLD,
    percentage: false,
    top_k: 20,
  });

  const byCategory = new Map<MaskCategory, DetectionHit[]>();

  for (const item of raw) {
    const category = resolveMaskCategory(item.label);
    if (!category) continue;
    if (item.score < DETECT_SCORE_THRESHOLD) continue;

    const hit: DetectionHit = {
      category,
      bbox: pixelBoxToNormalized(item.box, imageWidth, imageHeight),
      score: item.score,
      label: item.label,
    };
    const list = byCategory.get(category) ?? [];
    list.push(hit);
    byCategory.set(category, list);
  }

  const merged: DetectionHit[] = [];
  for (const hits of byCategory.values()) {
    const best = hits.reduce((a, b) => (a.score >= b.score ? a : b));
    merged.push({ ...best });
  }

  return merged;
}

function mergeDetectionHits(primary: DetectionHit[], extra: DetectionHit[]): DetectionHit[] {
  const map = groupDetectionsByCategory(primary);
  for (const hit of extra) {
    const prev = map.get(hit.category);
    if (!prev || hit.score > prev.score) {
      map.set(hit.category, hit);
    }
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

export async function detectMaskRegionsFromFile(
  file: File,
  onProgress?: DetectProgressCallback,
  gemmaCategories?: Set<MaskCategory>,
): Promise<DetectionHit[]> {
  onProgress?.('마스킹용 OwlViT 탐지 모델 준비...', 5);
  const detector = await getDetector(onProgress);
  const { width, height } = await readImageSize(file);
  onProgress?.(`이미지 해상도 ${width}×${height}px`, 40);
  const url = URL.createObjectURL(file);

  try {
    onProgress?.('열린 어휘(OwlViT)로 민감 영역 스캔 중...', 55);
    let hits = await runDetection(detector, url, OPEN_VOCAB_QUERIES, width, height);
    onProgress?.(`1차 탐지 완료 — 후보 ${hits.length}건`, 72);

    if (gemmaCategories && gemmaCategories.size > 0) {
      const missing = [...gemmaCategories].filter((c) => !hits.some((h) => h.category === c));
      if (missing.length > 0) {
        onProgress?.(`Gemma 유형 보강 탐지: ${missing.join(', ')}`, 80);
        const focusedLabels = [...gemmaCategories].flatMap((c) => MASK_CATEGORY_META[c].owlQueries);
        const extra = await runDetection(
          detector,
          url,
          Array.from(new Set(focusedLabels)),
          width,
          height,
        );
        hits = mergeDetectionHits(hits, extra);
        onProgress?.(`보강 탐지 완료 — 최종 ${hits.length}건`, 92);
      }
    }

    if (hits.length > 0) {
      const summary = hits.map((h) => `${h.category}(${(h.score * 100).toFixed(0)}%)`).join(', ');
      onProgress?.(`탐지 결과: ${summary}`, 95);
    } else {
      onProgress?.('자동 탐지 없음 — Gemma bbox·폴백 영역 사용', 95);
    }

    return hits;
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

export function getDetectedCategories(hits: DetectionHit[]): Set<MaskCategory> {
  return new Set(hits.map((h) => h.category));
}

export function queriesForGemmaCategories(categories: Set<MaskCategory>): string[] {
  if (categories.size === 0) return OPEN_VOCAB_QUERIES;
  const queries = [...categories].flatMap((c) => MASK_CATEGORY_META[c].owlQueries);
  return Array.from(new Set(queries));
}

export function disposeDetectionModel() {
  detectorPromise = null;
}
