/** Chrome MV3: ONNX Runtime wasm/mjs는 CDN이 아니라 확장 패키지 내 ort/ 에서 로드 */

export function getExtensionOrtWasmPaths() {
  const base =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('ort/')
      : '/ort/';

  return {
    mjs: `${base}ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${base}ort-wasm-simd-threaded.asyncify.wasm`,
  };
}

export function applyOrtWasmPaths(env: unknown) {
  const wasmPaths = getExtensionOrtWasmPaths();
  const onnx = (env as { backends?: { onnx?: { wasm?: Record<string, unknown> } } }).backends?.onnx;
  if (onnx?.wasm) {
    onnx.wasm.wasmPaths = wasmPaths;
  }
}
