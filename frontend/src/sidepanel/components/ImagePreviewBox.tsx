import { useEffect, useState } from 'react';
import { useAdaptiveImageHeight } from '../hooks/useAdaptiveImageHeight';

interface Props {
  src?: string;
  alt?: string;
  /** @deprecated maxHeight 사용 */
  height?: number;
  maxHeight?: number;
  minHeight?: number;
}

export function ImagePreviewBox({
  src,
  alt = '업로드 이미지',
  height,
  maxHeight = height ?? 360,
  minHeight = 80,
}: Props) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setNaturalSize(null);
  }, [src]);
  const { containerRef, layout } = useAdaptiveImageHeight(
    naturalSize?.w ?? null,
    naturalSize?.h ?? null,
    maxHeight,
    minHeight,
  );

  if (!src) {
    return (
      <div
        ref={containerRef}
        className="image-wire"
        style={{
          width: '100%',
          minHeight: minHeight,
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
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          width: layout.width > 0 ? layout.width : '100%',
          height: layout.height,
          maxWidth: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <img
          key={src}
          src={src}
          alt={alt}
          onLoad={(e) => {
            const img = e.currentTarget;
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>
    </div>
  );
}
