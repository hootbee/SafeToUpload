interface Props {
  imageName?: string;
  onPick: (name: string) => void;
}

export function ImageUploadBox({ imageName, onPick }: Props) {
  return (
    <section className="card">
      <h3>A-01 이미지 업로드</h3>
      <label className="upload-box">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file.name);
          }}
        />
        <span>{imageName ? `선택됨: ${imageName}` : '이미지 파일 선택 (mock)'}</span>
      </label>
    </section>
  );
}
