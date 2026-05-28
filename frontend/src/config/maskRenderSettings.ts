import {
  MASK_BLUR_PASSES,
  MASK_BLUR_RADIUS,
  MASK_DEFAULT_STYLE,
  MASK_FEATHER_PX,
  MASK_MOSAIC_CELL_PX,
  MASK_OVERLAY_OPACITY,
  MASK_PADDING_RATIO,
  MASK_PIXELATE_MAX_PX,
  MASK_PIXELATE_ROUNDS,
} from './models';
import type { MaskRenderStyle } from '../shared/maskRenderStyle';

/** Chrome Canvas filter blur는 반경이 커져도 효과가 포화됩니다. */
export const CANVAS_BLUR_RADIUS_CAP = 64;

export interface MaskRenderParams {
  style: MaskRenderStyle;
  blurRadius: number;
  blurPasses: number;
  pixelateMaxPx: number;
  pixelateRounds: number;
  featherPx: number;
  mosaicCellPx: number;
  /** bbox width/height 대비 확장 (0.05 = 5%) */
  paddingRatio: number;
  overlayOpacity: number;
  /** env 원본 (UI 표시용) */
  envBlurRadius: number;
  envBlurPasses: number;
}

export interface MaskRenderOptions {
  style?: MaskRenderStyle;
  blurRadius?: number;
  blurPasses?: number;
  pixelateMaxPx?: number;
  pixelateRounds?: number;
  mosaicCellPx?: number;
  overlayOpacity?: number;
  paddingRatio?: number;
}

/** env·options → 실제 Canvas에 쓰는 값 (블러 상한 보정 포함) */
export function resolveMaskRenderParams(options?: MaskRenderOptions): MaskRenderParams {
  const envBlurRadius = options?.blurRadius ?? MASK_BLUR_RADIUS;
  const envBlurPasses = options?.blurPasses ?? MASK_BLUR_PASSES;
  const pixelateMaxPx = options?.pixelateMaxPx ?? MASK_PIXELATE_MAX_PX;
  const pixelateRounds = options?.pixelateRounds ?? MASK_PIXELATE_ROUNDS;
  const overlayOpacity = options?.overlayOpacity ?? MASK_OVERLAY_OPACITY;
  const paddingRatio = Math.max(0, options?.paddingRatio ?? MASK_PADDING_RATIO);

  const style: MaskRenderStyle =
    options?.style === 'mosaic' || options?.style === 'legacy' ? options.style : MASK_DEFAULT_STYLE;

  const cappedBlur = Math.min(Math.max(1, envBlurRadius), CANVAS_BLUR_RADIUS_CAP);
  const blurPasses =
    envBlurPasses <= 0
      ? 0
      : Math.max(1, Math.ceil(envBlurPasses * (envBlurRadius / cappedBlur)));

  return {
    style,
    blurRadius: cappedBlur,
    blurPasses,
    pixelateMaxPx: Math.max(1, pixelateMaxPx),
    pixelateRounds: Math.max(1, pixelateRounds),
    featherPx: MASK_FEATHER_PX,
    mosaicCellPx: Math.max(4, options?.mosaicCellPx ?? MASK_MOSAIC_CELL_PX),
    paddingRatio,
    overlayOpacity: Math.max(0, Math.min(1, overlayOpacity)),
    envBlurRadius,
    envBlurPasses,
  };
}

export function formatMaskRenderSummary(params: MaskRenderParams): string {
  const blurNote =
    params.envBlurRadius > CANVAS_BLUR_RADIUS_CAP
      ? ` (env ${params.envBlurRadius}px → 캡 ${params.blurRadius}px, ${params.blurPasses}회)`
      : ` (${params.blurRadius}px × ${params.blurPasses}회)`;

  return [
    `블러${blurNote}`,
    `픽셀 ${params.pixelateMaxPx}px × ${params.pixelateRounds}회`,
    `페더 ${params.featherPx}px`,
    `패딩 ${Math.round(params.paddingRatio * 100)}%`,
    `오버레이 ${Math.round(params.overlayOpacity * 100)}%`,
  ].join(' · ');
}
