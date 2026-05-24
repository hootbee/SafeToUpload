/** 브라우저 WebGPU용 ONNX (Transformers.js) */
export const LOCAL_MODEL_ID =
  import.meta.env.VITE_LOCAL_MODEL_ID || 'onnx-community/gemma-4-E4B-it-ONNX';

/** 공식 PyTorch/Safetensors weights (서버·문서 참조용) */
export const OFFICIAL_LOCAL_MODEL_REF = 'google/gemma-4-E4B-it';

export const SERVER_MODEL_ID = import.meta.env.VITE_SERVER_MODEL_ID || 'gemma4:26b';

export const DEFAULT_SERVER_LLM_CHAT_URL =
  import.meta.env.VITE_SERVER_LLM_CHAT_URL ||
  'https://macmini.tail729089.ts.net:8443/api/chat/completions';

export const DEFAULT_SERVER_LLM_MODEL =
  import.meta.env.VITE_SERVER_LLM_MODEL || SERVER_MODEL_ID;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3270';

/** 게이트 모델·rate limit 시 Hugging Face Read 토큰 (선택) */
export const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || '';

/** 마스킹 영역 자동 탐지 (Transformers.js zero-shot object detection) */
export const DETECT_MODEL_ID =
  import.meta.env.VITE_DETECT_MODEL_ID || 'Xenova/owlvit-base-patch32';

export const DETECT_SCORE_THRESHOLD = Number(import.meta.env.VITE_DETECT_THRESHOLD ?? 0.08);

/** 마스킹 블러·픽셀화 강도 (숫자·간판 등 가독 불가 수준) */
export const MASK_BLUR_RADIUS = Number(import.meta.env.VITE_MASK_BLUR_RADIUS ?? 200);
export const MASK_BLUR_PASSES = Number(import.meta.env.VITE_MASK_BLUR_PASSES ?? 10);
export const MASK_PIXELATE_MAX_PX = Number(import.meta.env.VITE_MASK_PIXELATE_MAX_PX ?? 2);
export const MASK_PIXELATE_ROUNDS = Number(import.meta.env.VITE_MASK_PIXELATE_ROUNDS ?? 12);
/** 가장자리 페더(px) — 직사각형 테두리 없이 주변과 자연스럽게 블렌드 */
export const MASK_FEATHER_PX = Number(import.meta.env.VITE_MASK_FEATHER_PX ?? 28);
/** 0 = 블러만 적용 (회색·단색 박스 없음) */
export const MASK_OVERLAY_OPACITY = Number(import.meta.env.VITE_MASK_OVERLAY_OPACITY ?? 0);
