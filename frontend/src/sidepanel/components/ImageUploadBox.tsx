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
    const timer = setTimeout(() => {
      setPreviewUrls(urls);
    }, 0);
    return () => {
      clearTimeout(timer);
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <section className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
        <LuImageUp size={18} />
        이미지 업로드
      </h3>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '0px' }}>
          {previewUrls.map((url, index) => (
            url && (
              <ImagePreviewBox 
                key={url} 
                src={url} 
                alt={files[index]?.name} 
                height={140} 
              />
            )
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
          <p className="muted" style={{ margin: 0, fontSize: '12px' }}>
            * 현재 선택됨 {files.length > 1 ? `(${files.length}개)` : ''}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${file.lastModified}-${index}`} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  justifyContent: 'space-between', 
                  gap: '8px',
                  borderBottom: index !== files.length - 1 ? '1px solid #e2e8f0' : 'none', 
                  paddingBottom: index !== files.length - 1 ? '8px' : 0
                }}
              >
                <span className="muted" style={{ fontSize: '12px', wordBreak: 'break-all', lineHeight: 1.4 }}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px', fontWeight: 600, flexShrink: 0, padding: 0 }}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <label className="btn" style={{ textAlign: 'center', display: 'block', padding: '12px', cursor: 'pointer', margin: 0 }}>
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
    </section>
  );
}