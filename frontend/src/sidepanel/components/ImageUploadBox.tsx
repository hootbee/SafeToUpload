import { LuImageUp } from "react-icons/lu";

interface Props {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function ImageUploadBox({ files, onFilesChange }: Props) {
  return (
    <section className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LuImageUp size={18} />
        이미지 업로드
      </h3>

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
            }
          }}
        />
        <span>{files.length > 0 ? '파일 추가하기' : '이미지 파일 선택'}</span>
      </label>

      {files.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
            * 현재 선택됨
          </p>
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <span className="muted" style={{ fontSize: '12px' }}>
                {file.name}
              </span>
              <button 
                type="button" 
                onClick={() => onFilesChange(files.filter((_, i) => i !== index))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '11px' }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}