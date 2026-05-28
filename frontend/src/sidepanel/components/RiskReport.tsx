import { dedupeRiskReasons } from '@shared/risk-scoring';
import type { RiskReportData } from '../../shared/types';
import {
  RISK_CATEGORY_LABEL,
  RISK_LEVEL_LABEL,
  type RiskCategoryKey,
} from '../../shared/riskReportLabels';
import { TbReportAnalytics, TbHistory, TbAlertTriangle, TbChartPie, TbShieldX, TbTrendingUp } from "react-icons/tb";
import { HiOutlineIdentification } from "react-icons/hi2";
import { FiCamera } from "react-icons/fi";
import { IoImageOutline } from "react-icons/io5";
import { ImagePreviewBox } from './ImagePreviewBox';

interface Props {
  report: RiskReportData;
  isHistoryView?: boolean;
  onOpenDetail: (id: string) => void;
  onOpenRewrite: () => void;
  onOpenImageMasking: () => void;
}

function scoreColor(score: number): { color: string; bg: string } {
  if (score >= 80) return { color: '#B91C1C', bg: '#FEE2E2' };
  if (score >= 60) return { color: '#EF4444', bg: '#FEE2E2' };
  if (score >= 35) return { color: '#F59E0B', bg: '#FEF3C7' };
  return { color: '#10B981', bg: '#D1FAE5' };
}

const CATEGORY_KEYS: RiskCategoryKey[] = ['pii', 'exif', 'image', 'context'];

const CATEGORY_WEIGHTS: Record<RiskCategoryKey, { weight: number; score: (r: RiskReportData) => number; contrib: (r: RiskReportData) => number }> = {
  pii: { weight: 0.4, score: (r) => r.categoryScores.pii, contrib: (r) => r.scoreBreakdown.piiWeighted },
  exif: { weight: 0.15, score: (r) => r.categoryScores.exif, contrib: (r) => r.scoreBreakdown.exifWeighted },
  image: { weight: 0.3, score: (r) => r.categoryScores.image, contrib: (r) => r.scoreBreakdown.imageWeighted },
  context: { weight: 0.15, score: (r) => r.categoryScores.context, contrib: (r) => r.scoreBreakdown.contextWeighted },
};

export function RiskReport({
  report,
  isHistoryView = false,
  onOpenDetail,
  onOpenRewrite,
  onOpenImageMasking,
}: Props) {
  const colors = scoreColor(report.score);
  const riskReasons = dedupeRiskReasons(report.riskReasons);

  return (
    <div className="report-root">
      <div className="report-scroll-area">
        {report.uploadBlocked && (
          <section className="card" style={{ border: '1px solid #fecaca', background: '#fef2f2' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#b91c1c', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <TbAlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              {report.memorySignal?.message ?? '반복 위험 패턴으로 업로드가 차단되었습니다.'}
            </p>
          </section>
        )}

        <section className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: '0 0 16px 0' }}>
            <TbReportAnalytics size={18} /> 위험도 리포트
          </h2>
          <div style={{ background: colors.bg, padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 600 }}>
              최종 위험도
            </span>
            <div style={{ fontSize: '30px', fontWeight: 800, color: colors.color, marginTop: '4px' }}>
              {report.score}
              <span style={{ fontSize: '18px', color: '#94a3b8' }}> /100</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 700, color: colors.color }}>
              {RISK_LEVEL_LABEL[report.riskLevel]}
            </div>
          </div>
        </section>

        <section className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
            <TbChartPie size={18} /> 항목별 점수
          </h3>
          <ul style={{ margin: 0, paddingLeft: '22px', fontSize: '14px', lineHeight: 1.8, color: '#334155' }}>
            {CATEGORY_KEYS.map((key) => (
              <li key={key}>
                <strong>{RISK_CATEGORY_LABEL[key]}</strong>: {CATEGORY_WEIGHTS[key].score(report)}점 × {CATEGORY_WEIGHTS[key].weight} ={' '}
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{CATEGORY_WEIGHTS[key].contrib(report)}</span>
              </li>
            ))}
          </ul>
        </section>

        {(riskReasons.pii.length > 0 ||
          riskReasons.exif.length > 0 ||
          riskReasons.image.length > 0 ||
          riskReasons.context.length > 0) && (
          <section className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
              <TbShieldX size={18} /> 주요 위험 원인
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {CATEGORY_KEYS.map((key) =>
                riskReasons[key].length > 0 ? (
                  <div key={key} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                    <strong style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '6px' }}>
                      {RISK_CATEGORY_LABEL[key]}
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                      {riskReasons[key].map((r, i) => (
                        <li key={`${key}-${i}`}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          </section>
        )}

        {report.escalationRules.length > 0 && (
          <section className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
              <TbTrendingUp size={18} /> 추가로 올린 위험도
            </h3>
            <ul style={{ margin: 0, paddingLeft: '22px', fontSize: '13px', lineHeight: 1.6, color: '#334155' }}>
              {report.escalationRules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
            <HiOutlineIdentification size={18} /> 발견된 개인정보
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
            <FiCamera size={17} /> 사진·파일 속 숨은 정보
          </h3>
          <p className="muted" style={{ fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            {report.exifSummary}
          </p>
        </section>

        <section className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
            <IoImageOutline size={18} /> 이미지에서 보이는 위험
          </h3>
          {!isHistoryView && (report.imageEntries?.length ?? 0) > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {report.imageEntries?.map((entry, idx) => {
                const labels = entry.maskRegions.map((m) => m.label).join(', ') || '없음';
                return (
                  <div key={`entry-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <ImagePreviewBox
                      src={entry.imagePreviewUrl}
                      alt={entry.imageName ?? `업로드 이미지 ${idx + 1}`}
                      height={140}
                    />
                    <p className="muted" style={{ fontSize: '12px', margin: 0 }}>
                      {idx + 1}. {entry.imageName ?? `이미지 ${idx + 1}`} <br />· 마스킹 후보: {labels}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : !isHistoryView ? (
            <div style={{ marginBottom: '12px' }}>
              <ImagePreviewBox src={report.imagePreviewUrl} height={140} />
            </div>
          ) : null}
          <p className="muted" style={{ fontSize: '14px', margin: 0, marginBottom: isHistoryView ? 0 : '5px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {report.imageRiskSummary}
          </p>
          {!isHistoryView && (
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
          )}
        </section>

        <section className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', margin: '0 0 12px 0' }}>
            <TbHistory size={18} /> 과거 패턴 기억
          </h3>
          {report.memorySignal?.matched ? (
            <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px 0' }}>
                이전에 비슷한 위험 패턴이 있었습니다 (유사도 {report.memorySignal.memoryMatchScore}점)
              </p>
              <p className="muted" style={{ margin: 0, fontSize: '13px' }}>
                개인정보 점수 +{report.memorySignal.piiBoost} · 게시 상황 점수 +{report.memorySignal.contextBoost}
                {report.memorySignal.message ? ` — ${report.memorySignal.message}` : ''}
              </p>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: '14px', margin: 0 }}>
              과거 분석과 비슷한 반복 위험은 없습니다. 실제 연락처·주소 등 원문은 저장하지 않습니다.
            </p>
          )}
          {report.memoryPattern.hasData && (
            <div style={{ marginTop: '12px' }}>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px 0' }}>이번에 찾은 개인정보 종류</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {report.memoryPattern.frequencies.map((f) => (
                  <span 
                    key={f.label} 
                    style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#475569', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '9999px', cursor: 'default', userSelect: 'none' }}
                  >
                    {f.label} ({f.value})
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {!isHistoryView && (
        <label
          className="btn primary"
          role="button"
          tabIndex={0}
          onClick={onOpenRewrite}
          style={{ padding: '14px', textAlign: 'center', flexShrink: 0 }}
          onKeyDown={(e) => e.key === 'Enter' && onOpenRewrite()}
        >
          텍스트 수정 제안
        </label>
      )}
    </div>
  );
}