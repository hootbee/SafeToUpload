import { useEffect, useRef, useState } from 'react';

export interface AdaptiveImageLayout {
  width: number;
  height: number;
}

export function computeAdaptiveImageLayout(
  containerWidth: number,
  naturalWidth: number,
  naturalHeight: number,
  maxHeight: number,
  minHeight: number,
): AdaptiveImageLayout {
  if (containerWidth <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: Math.max(0, containerWidth), height: minHeight };
  }

  let height = containerWidth * (naturalHeight / naturalWidth);
  let width = containerWidth;

  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * (naturalWidth / naturalHeight);
  }

  return {
    width: Math.round(width),
    height: Math.max(minHeight, Math.round(height)),
  };
}

/** 컨테이너 너비·이미지 원본 비율에 맞춘 미리보기 크기 */
export function useAdaptiveImageHeight(
  naturalWidth: number | null,
  naturalHeight: number | null,
  maxHeight = 360,
  minHeight = 80,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalWidth, naturalHeight]);

  const layout =
    naturalWidth && naturalHeight && containerWidth > 0
      ? computeAdaptiveImageLayout(containerWidth, naturalWidth, naturalHeight, maxHeight, minHeight)
      : { width: containerWidth, height: minHeight };

  return { containerRef, layout, containerWidth };
}
