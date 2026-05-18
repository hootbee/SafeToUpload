import type { RiskReportData } from '../../shared/types';

interface Props {
  report: RiskReportData;
  onOpenDetail: (id: string) => void;
  onOpenRewrite: () => void;
  onOpenImageMasking: () => void;
}

export function RiskReport({ report, onOpenDetail, onOpenRewrite, onOpenImageMasking }: Props) {
  return (
    <section className="card">
      <h2>C-03 위험도 리포트</h2>
      <div className="score-card">종합 위험 점수: {report.score}</div>
      <div className="grid-2">
        <article className="mini-card">
          <h3>PII 항목</h3>
          {report.piiItems.map((pii) => (
            <button type="button" key={pii.id} className="link-like" onClick={() => onOpenDetail(pii.id)}>
              {pii.type}
            </button>
          ))}
        </article>
        <article className="mini-card">
          <h3>EXIF 카드</h3>
          <p>{report.exifSummary}</p>
        </article>
        <article className="mini-card">
          <h3>이미지 위험 카드</h3>
          <p>{report.imageRiskSummary}</p>
          <button className="btn" type="button" onClick={onOpenImageMasking}>
            D-02 이미지 마스킹
          </button>
        </article>
        <article className="mini-card">
          <h3>컨텍스트 분석 카드</h3>
          <p>{report.contextSummary}</p>
        </article>
        <article className="mini-card full">
          <h3>E-02 누적 패턴 메모리 카드</h3>
          {report.memoryPattern.frequencies.map((f) => (
            <div key={f.label} className="bar-row">
              <span>{f.label}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${f.value * 12}%` }} />
              </div>
            </div>
          ))}
          <p className="muted">키워드: {report.memoryPattern.keywords.join(', ')}</p>
        </article>
      </div>
      <button className="btn" type="button" onClick={onOpenRewrite}>
        D-01 텍스트 수정 제안
      </button>
    </section>
  );
}
