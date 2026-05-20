import { MdOutlineTextsms } from "react-icons/md";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function TextInputCard({ value, onChange }: Props) {
  return (
    <section className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MdOutlineTextsms size={18} />
        텍스트 입력
      </h3>
      <textarea
        className="text-area"
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="게시 전 점검할 텍스트를 입력하세요"
      />
    </section>
  );
}