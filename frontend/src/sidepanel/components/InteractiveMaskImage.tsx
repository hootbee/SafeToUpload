import { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeContainedImageLayout,
  normalizedBboxToDisplayRect,
  pointerRectToNormalizedBbox,
  type ContainedImageLayout,
} from '../../services/manualMaskCoords';
import type { MaskRegion, NormalizedBbox } from '../../shared/types';
import { useAdaptiveImageHeight } from '../hooks/useAdaptiveImageHeight';

interface Props {
  src?: string;
  alt?: string;
  maxHeight?: number;
  minHeight?: number;
  regions?: MaskRegion[];
  manualEditActive: boolean;
  disabled?: boolean;
  onAddRegion?: (bbox: NormalizedBbox) => void;
}

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

export function InteractiveMaskImage({
  src,
  alt = '업로드 이미지',
  maxHeight = 400,
  minHeight = 80,
  regions = [],
  manualEditActive,
  disabled = false,
  onAddRegion,
}: Readonly<Props>) {
  const [imageLayout, setImageLayout] = useState<ContainedImageLayout | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const { containerRef, layout: adaptiveLayout } = useAdaptiveImageHeight(
    naturalSize?.w ?? null,
    naturalSize?.h ?? null,
    maxHeight,
    minHeight,
  );
  const imageBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNaturalSize(null);
    setImageLayout(null);
  }, [src]);

  const measureLayout = useCallback(() => {
    const el = imageBoxRef.current;
    if (!el || !naturalSize) {
      setImageLayout(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const next = computeContainedImageLayout(rect.width, rect.height, naturalSize.w, naturalSize.h);
    setImageLayout(next);
  }, [naturalSize]);

  useEffect(() => {
    measureLayout();
    const el = imageBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureLayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureLayout, adaptiveLayout.height, adaptiveLayout.width]);

  const pointerToLocal = (clientX: number, clientY: number) => {
    const el = imageBoxRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!manualEditActive || disabled || !onAddRegion || !imageLayout) return;
    if (e.button !== 0) return;
    const { x, y } = pointerToLocal(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ pointerId: e.pointerId, startX: x, startY: y, currentX: x, currentY: y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const { x, y } = pointerToLocal(e.clientX, e.clientY);
    setDrag((prev) => (prev ? { ...prev, currentX: x, currentY: y } : prev));
  };

  const finishDrag = (e: React.PointerEvent) => {
    if (!drag || drag.pointerId !== e.pointerId || !imageLayout || !onAddRegion) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const bbox = pointerRectToNormalizedBbox(
      imageLayout,
      drag.startX,
      drag.startY,
      drag.currentX,
      drag.currentY,
    );
    if (bbox) onAddRegion(bbox);
    setDrag(null);
  };

  const draftRect = drag
    ? {
        left: Math.min(drag.startX, drag.currentX),
        top: Math.min(drag.startY, drag.currentY),
        width: Math.abs(drag.currentX - drag.startX),
        height: Math.abs(drag.currentY - drag.startY),
      }
    : null;

  const overlayRegions = regions.filter((r) => r.checked || r.source === 'user');

  if (!src) {
    return (
      <div
        ref={containerRef}
        className="image-wire"
        style={{
          height: minHeight,
          background: '#f1f5f9',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
        }}
      >
        이미지 미리보기
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        borderRadius: '12px',
        background: '#f1f5f9',
        border: manualEditActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      }}
    >
      <div
        ref={imageBoxRef}
        style={{
          position: 'relative',
          width: adaptiveLayout.width > 0 ? adaptiveLayout.width : '100%',
          height: adaptiveLayout.height,
          maxWidth: '100%',
          borderRadius: '10px',
          overflow: 'hidden',
          touchAction: manualEditActive ? 'none' : 'auto',
          cursor: manualEditActive && !disabled ? 'crosshair' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <img
          key={src}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
        />
      {imageLayout &&
        overlayRegions.map((region) => {
          const rect = normalizedBboxToDisplayRect(imageLayout, region.bbox);
          const isUser = region.source === 'user';
          return (
            <div
              key={region.id}
              style={{
                position: 'absolute',
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                border: `2px ${isUser ? 'dashed' : 'solid'} ${region.checked ? '#3b82f6' : '#94a3b8'}`,
                borderRadius: 4,
                background: region.checked ? 'rgba(59,130,246,0.12)' : 'rgba(148,163,184,0.08)',
                pointerEvents: 'none',
                boxSizing: 'border-box',
              }}
            />
          );
        })}
      {draftRect && draftRect.width > 0 && draftRect.height > 0 && (
        <div
          style={{
            position: 'absolute',
            left: draftRect.left,
            top: draftRect.top,
            width: draftRect.width,
            height: draftRect.height,
            border: '2px dashed #2563eb',
            background: 'rgba(37,99,235,0.15)',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}
      </div>
    </div>
  );
}
