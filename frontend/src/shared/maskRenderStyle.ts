/** 이미지 마스킹 렌더 방식 */
export type MaskRenderStyle = 'legacy' | 'mosaic';

export const MASK_RENDER_STYLE_LABEL: Record<MaskRenderStyle, string> = {
  legacy: '픽셀 (강한 블러)',
  mosaic: '모자이크 (약한 블러)',
};
