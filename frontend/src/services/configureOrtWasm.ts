/** Chrome MV3: ONNX Runtime wasm/mjs는 CDN이 아니라 확장 패키지 내 ort/ 에서 로드 */

export function getExtensionOrtWasmPaths() {
  const rawBase =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('ort/')
      : '/ort/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return {
    mjs: `${base}ort-wasm-simd-threaded.jsep.mjs`,
    wasm: `${base}ort-wasm-simd-threaded.wasm`,
  };
}

export function applyOrtWasmPaths(env: unknown) {
  const wasmPaths = getExtensionOrtWasmPaths();
  const onnx = (env as {
    backends?: {
      onnx?: {
        wasm?: {
          wasmPaths?: unknown;
          proxy?: boolean;
          numThreads?: number;
        };
        executionProviders?: string[];
      };
    };
  }).backends?.onnx;
  if (onnx?.wasm) {
    const baseUrl = wasmPaths.wasm.replace(/ort-wasm-simd-threaded\.wasm$/, '');
    onnx.wasm.wasmPaths = baseUrl;
    onnx.wasm.proxy = false;
    onnx.wasm.numThreads = 1;
  }
  if (onnx) {
    onnx.executionProviders = ['wasm'];
  }
}
