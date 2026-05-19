import { LuImageUp } from "react-icons/lu";

interface Props {
  imageName?: string;
  onPick: (name: string) => void;
}

export function ImageUploadBox({ imageName, onPick }: Props) {
  return (
    <section className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LuImageUp size={18} />
        이미지 업로드
      </h3>
      <label className={`btn ${imageName ? 'selected' : ''}`}>
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file.name);
          }}
        />
        <span>{imageName ? `파일 변경`: '이미지 파일 선택'}</span>
      </label>
      {imageName && (
        <p className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
          * 현재 선택됨: {imageName}
        </p>
      )}
    </section>
  );
}