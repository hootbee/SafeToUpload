import type { RiskReportData } from '../../shared/types';

interface Props {
  report: RiskReportData;
  onToggleMask: (id: string) => void;
}

export function ImageMaskingPanel({ report, onToggleMask }: Props) {
  return (
    <section className="card">
      <h2>D-02 이미지 마스킹</h2>
      <div className="image-wire">이미지 미리보기 와이어프레임</div>
      <div className="check-grid">
        {report.imageMasks.map((mask) => (
          <label key={mask.id}>
            <input type="checkbox" checked={mask.checked} onChange={() => onToggleMask(mask.id)} /> {mask.label}
          </label>
        ))}
      </div>
      <div className="row-gap">
        <button className="btn" type="button">
          마스킹 적용
        </button>
        <button className="btn" type="button">
          다운로드
        </button>
      </div>
    </section>
  );
}
