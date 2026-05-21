import type { RiskReportData } from '../../shared/types';
import { IoImageOutline } from "react-icons/io5";

interface Props {
  report: RiskReportData;
  onToggleMask: (id: string) => void;
}

export function ImageMaskingPanel({ report, onToggleMask }: Props) {
  return (
    <section className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: '0 0 16px 0' }}>
        <IoImageOutline size={18} /> 이미지 마스킹
      </h2>
      <div className="image-wire" style={{ height: '160px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '20px' }}>
        이미지 미리보기
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {report.imageMasks.map((mask) => (
          <label
            key={mask.id}
            style={{ display: 'flex', alignItems: 'center', padding: '8px', background: mask.checked ? '#eff6ff' : '#f8fafc', border: `1px solid ${mask.checked ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: mask.checked ? '#1d4ed8' : '#64748b' }}>
            <input type="checkbox" style={{ marginRight: '8px' }} checked={mask.checked} onChange={() => onToggleMask(mask.id)} />
              {mask.label}
          </label>
        ))}
      </div>
      <div className="row-gap">
        <label
          className="btn"
          role="button"
          tabIndex={0}
          //onClick={onCancel}
          //onKeyDown={(e) => e.key === 'Enter' && onCancel()}
          >
          마스킹 적용
        </label>
        <label
          className="btn primary"
          role="button"
          tabIndex={0}
          //onClick={onDownload}
          //onKeyDown={(e) => e.key === 'Enter' && onDownload()}
          >
          다운로드
        </label>
      </div>
    </section>
  );
}
