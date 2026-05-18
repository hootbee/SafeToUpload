import { useState } from 'react';
import type { RiskReportData } from '../../shared/types';

interface Props {
  report: RiskReportData;
}

export function RewriteSuggestion({ report }: Props) {
  const [message, setMessage] = useState('');

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(report.rewrittenText);
      setMessage('복사 완료');
    } catch {
      setMessage('복사 실패: 권한 오류 (mock)');
    }
  };

  return (
    <section className="card">
      <h2>D-01 텍스트 수정 제안</h2>
      <p className="muted">원문 위험 구간 하이라이트 (wireframe)</p>
      <div className="highlight-box">{report.originalText}</div>
      <h3>AI 수정안</h3>
      <div className="highlight-box">{report.rewrittenText}</div>
      <button className="btn" type="button" onClick={copyText}>
        수정본 복사
      </button>
      {message && <p className="muted">{message}</p>}
    </section>
  );
}
