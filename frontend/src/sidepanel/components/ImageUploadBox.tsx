import { useEffect, useState } from 'react';
import { LuImageUp } from 'react-icons/lu';
import { ImagePreviewBox } from './ImagePreviewBox';

interface Props {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function ImageUploadBox({ files, onFilesChange }: Props) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <section className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LuImageUp size={18} />
        이미지 업로드
      </h3>

      {files.length > 0 && previewUrls[0] && (
        <div style={{ marginBottom: '12px' }}>
          <ImagePreviewBox src={previewUrls[0]} alt={files[0]?.name} height={140} />
        </div>
      )}

      <label className="btn">
        <input
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              const newFiles = Array.from(e.target.files);
              onFilesChange([...files, ...newFiles]);
              e.target.value = '';
            }
          }}
        />
        <span>{files.length > 0 ? '파일 추가하기' : '이미지 파일 선택'}</span>
      </label>

      {files.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p className="muted" style={{ margin: 0, fontSize: '12px' }}>
            * 현재 선택됨 {files.length > 1 ? `(${files.length}개, 선택한 모든 이미지를 순차 분석)` : ''}
          </p>
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: index > 0 ? '8px 0 0' : 0,
                borderTop: index > 0 ? '1px solid #e2e8f0' : undefined,
              }}
            >
              {index > 0 && previewUrls[index] && (
                <ImagePreviewBox src={previewUrls[index]} alt={file.name} height={80} />
              )}
              <div className="file-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span className="muted" style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                  {files.length > 1 ? `${index + 1}. ${file.name}` : file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '11px', flexShrink: 0 }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
