interface Props {
  src?: string;
  alt?: string;
  height?: number;
}

export function ImagePreviewBox({ src, alt = '업로드 이미지', height = 160 }: Props) {
  if (!src) {
    return (
      <div
        className="image-wire"
        style={{
          height,
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
      style={{
        height,
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
      }}
    >
      <img
        key={src}
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
}
