import { HF_TOKEN, LOCAL_MODEL_ID } from '../config/models';
import { applyOrtWasmPaths } from './configureOrtWasm';
import type { AiAnalysisResponse } from '../shared/aiTypes';
import type { AnalysisInput } from '../shared/types';
import { ANALYSIS_JSON_SCHEMA_BLOCK } from '@shared/analysis-prompt-schema';
import { heuristicPiiScan, normalizeAiResponse, parseModelJsonOutput } from './analysisMapper';
import {
  categoryDisplayLabel,
  inferMaskCategoriesFromContext,
} from './maskCategoryUtils';

type ProgressCallback = (progress: number, status: string) => void;
type StageCallback = (stageTitle: string, log: string, progress?: number) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gemma4Runtime = { model: any; processor: any };

let loaded: Gemma4Runtime | null = null;
let loadPromise: Promise<void> | null = null;

function mapProgress(
  info: { status?: string; progress?: number; file?: string },
  onProgress?: ProgressCallback,
  base = 30,
  span = 65,
) {
  if (info.status === 'progress' || info.status === 'progress_total') {
    const pct = base + Math.round((info.progress ?? 0) * span);
    onProgress?.(Math.min(pct, 98), info.file ?? info.status ?? 'loading');
  }
}

function configureTransformersEnv(env: { allowLocalModels: boolean; useBrowserCache: boolean }) {
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  if (HF_TOKEN) {
    (env as { HF_TOKEN?: string }).HF_TOKEN = HF_TOKEN;
  }
}

async function loadImageFromFile(file: File) {
  const { load_image } = await import('@huggingface/transformers');
  const url = URL.createObjectURL(file);
  try {
    return await load_image(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function isWebGpuAvailable(): Promise<boolean> {
  if (!('gpu' in navigator) || !navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return Boolean(adapter);
  } catch {
    return false;
  }
}

export async function loadLocalModel(onProgress?: ProgressCallback): Promise<void> {
  if (loaded) {
    onProgress?.(100, 'ready');
    return;
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    onProgress?.(5, 'checking-webgpu');
    const webgpu = await isWebGpuAvailable();
    if (!webgpu) {
      throw new Error('WebGPU를 사용할 수 없습니다. Chrome 최신 버전과 GPU 드라이버를 확인하세요.');
    }

    onProgress?.(12, 'loading-transformers');
    const { AutoProcessor, Gemma4ForConditionalGeneration, env } = await import('@huggingface/transformers');
    applyOrtWasmPaths(env);
    configureTransformersEnv(env);

    const progressCb = (info: { status?: string; progress?: number; file?: string }) =>
      mapProgress(info, onProgress);

    onProgress?.(25, 'loading-processor');
    const processor = await AutoProcessor.from_pretrained(LOCAL_MODEL_ID, {
      progress_callback: progressCb,
    });

    onProgress?.(40, 'loading-model');
    const model = await Gemma4ForConditionalGeneration.from_pretrained(LOCAL_MODEL_ID, {
      dtype: 'q4f16',
      device: 'webgpu',
      progress_callback: progressCb,
    });

    loaded = { model, processor };
    onProgress?.(100, 'ready');
  })();

  try {
    await loadPromise;
  } catch (error) {
    loadPromise = null;
    loaded = null;
    throw error;
  }
}

export function isLocalModelReady() {
  return Boolean(loaded);
}

export async function runLocalAnalysis(
  input: AnalysisInput,
  onStage?: StageCallback,
): Promise<AiAnalysisResponse> {
  if (!loaded) {
    throw new Error('로컬 모델이 로드되지 않았습니다.');
  }

  const { model, processor } = loaded;
  const hasImage = Boolean(input.imageFile);

  onStage?.('PII 탐지', '분석 요청 준비 중...', 8);
  onStage?.(
    'PII 탐지',
    hasImage
      ? `업로드 이미지·텍스트 로드 (${input.imageName ?? 'image'})`
      : '게시글 텍스트 로드',
    12,
  );

  const userContent: Array<{ type: 'text' | 'image'; text?: string }> = [];
  if (hasImage) {
    userContent.push({ type: 'image' });
  }
  userContent.push({ type: 'text', text: buildAnalysisPrompt(input, hasImage) });

  const messages = [{ role: 'user' as const, content: userContent }];

  const prompt = processor.apply_chat_template(messages, {
    enable_thinking: false,
    add_generation_prompt: true,
    tokenize: false,
  } as Record<string, unknown>);

  onStage?.('PII 탐지', 'Gemma4 입력 토큰화 중...', 18);

  const image = hasImage && input.imageFile ? await loadImageFromFile(input.imageFile) : null;
  // Gemma4Processor._call(text, images?, audio?, options) — 3번째에 options를 넣으면 오디오로 처리됨
  const inputs = await processor(prompt, image, null, { add_special_tokens: false });
  const inputLen = inputs.input_ids.dims?.at(-1) ?? 0;

  onStage?.(
    'PII 탐지',
    hasImage
      ? 'WebGPU에서 Gemma4 멀티모달 추론 실행 중… (30초~2분 소요될 수 있음)'
      : 'WebGPU에서 Gemma4 텍스트 추론 실행 중…',
    28,
  );

  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: 700,
    do_sample: false,
  });

  onStage?.('컨텍스트 분석', '모델 출력 디코딩·JSON 파싱 중...', 52);

  const newTokens = (outputs as { slice: (a: null, b: [number, null]) => unknown }).slice(null, [
    inputLen,
    null,
  ]);
  const decoded = processor.batch_decode(newTokens, {
    skip_special_tokens: true,
  });
  const raw = decoded[0] ?? '';

  onStage?.(
    '컨텍스트 분석',
    '위험 점수·PII 항목·맥락 요약 정리 중...',
    58,
  );
  onStage?.('이미지 분석', hasImage ? '이미지 위험 유형(imageRisks) 반영' : '텍스트 중심 분석 (이미지 없음)', 62);
  onStage?.('리라이트 제안', '안전 게시 문안(rewrite) 생성', 66);

  const parsed = parseModelJsonOutput(raw);

  return normalizeAiResponse(
    {
      ...(parsed ?? {}),
      piiItems: parsed?.piiItems ?? heuristicPiiScan(input.text),
      imageRisks:
        hasImage && (!parsed?.imageRisks || (Array.isArray(parsed.imageRisks) && parsed.imageRisks.length === 0))
          ? buildFallbackImageRisks(input.text)
          : parsed?.imageRisks,
      rawAiResponse: {
        mode: 'local',
        model: LOCAL_MODEL_ID,
        device: 'webgpu',
        dtype: 'q4f16',
        hasImage,
      },
    },
    input,
  );
}

function buildAnalysisPrompt(input: AnalysisInput, hasImage: boolean) {
  const imageSection = hasImage
    ? `
업로드된 이미지도 함께 분석하세요.
imageRisks에는 이미지에서 실제로 확인된 유형만 넣으세요. 없으면 빈 배열 [].
type은 반드시 다음 중 하나: face, license_plate, building_sign
예: {"type":"building_sign","label":"건물 번호 간판","severity":"high","description":"114 동호수","bbox":{"x":0.35,"y":0.72,"width":0.3,"height":0.08}}
bbox는 이미지 전체 대비 0~1 비율(x,y=좌상단, width/height=크기)입니다.
`
    : '';

  return `당신은 SNS 게시 전 개인정보 점검 AI입니다. 아래 게시글을 분석하고 반드시 JSON만 출력하세요.
${imageSection}
플랫폼: ${input.platform}
게시글:
"""
${input.text || '(빈 텍스트)'}
"""

rewriteSuggestion 작성 규칙(매우 중요):
- 원문의 문장 순서, 말투, 이모지, 만남·일정·주차 등 맥락은 최대한 그대로 유지한다.
- 치환·삭제 대상(치명적 개인정보만): 휴대폰 번호, 이메일 주소, 아파트 동·호수, 도로명·번지·층수 등 상세 주소, 실명, 생년월일·주민번호, 차량번호, 현관 비밀번호.
- 문장 통째 삭제, "DM으로 연락" 같은 새 안내를 임의로 여러 번 넣기, "올리지 않을게요" 같은 메타 설명은 하지 않는다.
- 수정은 해당 토큰만 일반화한다(예: 010-1234-5678 → 연락은 DM으로, 114동 403호 → 동·호는 비공개).
- rewriteSuggestion 값에는 수정된 게시글 전문만 넣는다(지침·설명·대괄호 플레이스홀더 금지).

${ANALYSIS_JSON_SCHEMA_BLOCK}
imageRisks type: face | license_plate | building_sign (bbox 0~1 optional)`;
}

function buildFallbackImageRisks(text: string): Array<Record<string, unknown>> {
  const categories = inferMaskCategoriesFromContext([], text);
  if (categories.size === 0) {
    return [
      {
        type: 'building_sign',
        label: '건물·간판·표식',
        severity: 'medium',
        description: '이미지 시각 분석 — 영역은 OwlViT·폴백 bbox로 보정됩니다.',
      },
    ];
  }
  return [...categories].map((type) => ({
    type,
    label: categoryDisplayLabel(type),
    severity: 'medium',
    description: '텍스트·이미지 맥락에서 추정된 마스킹 유형',
  }));
}

export function disposeLocalModel() {
  loaded = null;
  loadPromise = null;
}
