import type { RiskReportData } from '../../shared/types';
import { TbReportAnalytics, TbMessageCode, TbHistory } from "react-icons/tb";
import { HiOutlineIdentification } from "react-icons/hi2";
import { FiCamera } from "react-icons/fi";
import { IoImageOutline } from "react-icons/io5";
import { ImagePreviewBox } from './ImagePreviewBox';

interface Props {
  report: RiskReportData;
  onOpenDetail: (id: string) => void;
  onOpenRewrite: () => void;
  onOpenImageMasking: () => void;
}

export function RiskReport({ report, onOpenDetail, onOpenRewrite, onOpenImageMasking }: Props) {
  const isHighScore = report.score >= 70;
  const scoreColor = isHighScore ? '#EF4444' : report.score >= 40 ? '#F59E0B' : '#10B981';
  const scoreBg = isHighScore ? '#FEE2E2' : report.score >= 40 ? '#FEF3C7' : '#D1FAE5';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="report-scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '684px', overflowY: 'auto', paddingRight: '8px', marginBottom: '16px'}}>
        <section className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: '0 0 16px 0' }}>
            <TbReportAnalytics size={18} /> 위험도 리포트
          </h2>
          <div style={{ background: scoreBg, padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 600 }}>
              종합 위험 점수
            </span>
            <div style={{ fontSize: '30px', fontWeight: 800, color: scoreColor, marginTop: '4px' }}>
              {report.score}
              <span style={{ fontSize: '18px', color: '#94a3b8' }}>
                /100
              </span>
            </div>
          </div>
        </section>
      <section className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
          <HiOutlineIdentification size={18} /> PII 항목
        </h3>
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '8px', alignItems: 'center', width: '100%', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '4px' }}>
          {report.piiItems.map((pii) => (
            <label
              className="btn danger" 
              role="button" 
              tabIndex={0} 
              key={pii.id} 
              onClick={() => onOpenDetail(pii.id)} 
              style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', fontSize: '13px', borderRadius: '15px', fontWeight: 600, width: 'auto', flexShrink: 0, userSelect: 'none' }}
              onKeyDown={(e) => e.key === 'Enter' && onOpenDetail(pii.id)}
            >
              {pii.type}
            </label>
          ))}
        </div>
      </section>
      <section className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
          <FiCamera size={17} /> EXIF 카드
        </h3>
        <p className="muted" style={{ fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
          {report.exifSummary}
        </p>
      </section>
      <section className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
          <IoImageOutline size={18} /> 이미지 위험 카드
        </h3>
        <div style={{ marginBottom: '12px' }}>
          <ImagePreviewBox src={report.imagePreviewUrl} height={140} />
        </div>
        <p className="muted" style={{ fontSize: '14px', marginBottom: '5px', lineHeight: 1.5 }}>
          {report.imageRiskSummary}
        </p>
        <label 
          className="btn" 
          role="button" 
          tabIndex={0} 
          onClick={onOpenImageMasking} 
          style={{ padding: '8px', textAlign: 'center' }}
          onKeyDown={(e) => e.key === 'Enter' && onOpenImageMasking()}
        >
          이미지 마스킹
        </label>
      </section>
      <section className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
          <TbMessageCode size={18} /> 컨텍스트 분석 카드
        </h3>
        <p className="muted" style={{ fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
          {report.contextSummary}
        </p>
      </section>
      <section className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
          <TbHistory size={18} /> 누적 패턴 메모리
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {report.memoryPattern.frequencies.map((f) => (
            <div
              className="riskreport-bar"
              key={f.label}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', minWidth: 0 }}
            >
              <span
                style={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  color: '#64748b',
                  lineHeight: 1,
                }}
              >
                {f.label}
              </span>
              <div
                style={{ flex: 1, minWidth: 0, height: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}
                className="bar-track"
              >
                <div className="bar-fill" style={{ width: `${Math.min(100, f.value * 12)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: '13px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', margin: 0 }}>
          <strong style={{ color: '#475569', marginRight: '8px' }}>핵심 키워드</strong> {report.memoryPattern.keywords.join(', ')}
        </p>
      </section>
      </div>
      <label 
        className="btn primary" 
        role="button" 
        tabIndex={0} 
        onClick={onOpenRewrite} 
        style={{ padding: '14px', textAlign: 'center', marginTop: '8px' }}
        onKeyDown={(e) => e.key === 'Enter' && onOpenRewrite()}
      >
        텍스트 수정 제안
      </label>
    </div>
  );
}