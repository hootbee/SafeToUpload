import { useState } from 'react';
import type { RiskReportData } from '../../shared/types';
import { TbEdit, TbCopy, TbCheck } from "react-icons/tb";

interface Props {
  report: RiskReportData;
}

export function RewriteSuggestion({ report }: Props) {
  const [copied, setCopied] = useState(false);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(report.rewrittenText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패', err);
    }
  };

  return (
    <section className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: '0 0 16px 0' }}>
        <TbEdit size={18} /> 텍스트 수정 제안
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px'}}>
        <article>
          <p style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '600' }} className="muted">원문 위험 구간</p>
          <div className="highlight-box" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '16px', borderRadius: '12px', fontSize: '14px', lineHeight: 1.6 }}>
            {report.originalText}
          </div>
        </article>
        <article>
          <p style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '600' }} className="muted">AI 수정안</p>
          <div className="highlight-box" style={{ background: '#f0fdf4', border: '1px solid #dcfce7', color: '#166534', padding: '16px', borderRadius: '12px', fontSize: '14px', lineHeight: 1.6 }}>
            {report.rewrittenText}
          </div>
        </article>
      </div>
      <label
        className="btn"
        role="button"
        onClick={copyText}
        style={{ marginTop: '15px' }}
        >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {copied ? <TbCheck size={18} /> : <TbCopy size={18} />}
          {copied ? '복사 완료' : '수정본 복사'}
        </span>
      </label>
    </section>
  );
}
