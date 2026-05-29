import type { NormalizedBbox } from '../shared/types';

export interface ContainedImageLayout {
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
  containerWidth: number;
  containerHeight: number;
}

/** object-fit: contain 과 동일한 배치 */
export function computeContainedImageLayout(
  containerWidth: number,
  containerHeight: number,
  imageNaturalWidth: number,
  imageNaturalHeight: number,
): ContainedImageLayout | null {
  if (containerWidth <= 0 || containerHeight <= 0 || imageNaturalWidth <= 0 || imageNaturalHeight <= 0) {
    return null;
  }
  const scale = Math.min(
    containerWidth / imageNaturalWidth,
    containerHeight / imageNaturalHeight,
  );
  const displayWidth = imageNaturalWidth * scale;
  const displayHeight = imageNaturalHeight * scale;
  return {
    offsetX: (containerWidth - displayWidth) / 2,
    offsetY: (containerHeight - displayHeight) / 2,
    displayWidth,
    displayHeight,
    containerWidth,
    containerHeight,
  };
}

/** 컨테이너 기준 포인터 좌표 → 정규화 bbox (0~1) */
export function pointerRectToNormalizedBbox(
  layout: ContainedImageLayout,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  minDisplayPx = 8,
): NormalizedBbox | null {
  const { offsetX, offsetY, displayWidth, displayHeight } = layout;
  const x1 = Math.min(startX, endX);
  const y1 = Math.min(startY, endY);
  const x2 = Math.max(startX, endX);
  const y2 = Math.max(startY, endY);

  const ix1 = x1 - offsetX;
  const iy1 = y1 - offsetY;
  const ix2 = x2 - offsetX;
  const iy2 = y2 - offsetY;

  if (ix2 <= 0 || iy2 <= 0 || ix1 >= displayWidth || iy1 >= displayHeight) return null;

  const clampedX1 = Math.max(0, ix1);
  const clampedY1 = Math.max(0, iy1);
  const clampedX2 = Math.min(displayWidth, ix2);
  const clampedY2 = Math.min(displayHeight, iy2);

  const w = clampedX2 - clampedX1;
  const h = clampedY2 - clampedY1;
  if (w < minDisplayPx || h < minDisplayPx) return null;

  return {
    x: clampedX1 / displayWidth,
    y: clampedY1 / displayHeight,
    width: w / displayWidth,
    height: h / displayHeight,
  };
}

/** 정규화 bbox → 컨테이너 기준 화면 rect (오버레이용) */
export function normalizedBboxToDisplayRect(
  layout: ContainedImageLayout,
  bbox: { x: number; y: number; width: number; height: number },
): { left: number; top: number; width: number; height: number } {
  const { offsetX, offsetY, displayWidth, displayHeight } = layout;
  return {
    left: offsetX + bbox.x * displayWidth,
    top: offsetY + bbox.y * displayHeight,
    width: bbox.width * displayWidth,
    height: bbox.height * displayHeight,
  };
}
