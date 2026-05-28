import type { AnalysisStage } from '../../shared/types';
import { LuActivity } from "react-icons/lu";

interface Props {
  stages: AnalysisStage[];
  currentStageTitle: string;
  progress: number;
  onRequestCancel: () => void;
}

export function AgentProgress({
  stages,
  currentStageTitle,
  progress,
  onRequestCancel,
}: Props) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  return (
    <section className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LuActivity size={18} />
        Agent 분석 중
      </h2>
      <p className="muted" style={{ fontSize: '14px', marginBottom: '8px' }}>
        현재 단계: <strong>{currentStageTitle}</strong>
      </p>
      <div
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="분석 진행률"
        style={{
          height: '6px',
          borderRadius: '3px',
          background: 'var(--border, #e5e7eb)',
          marginBottom: '15px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clampedProgress}%`,
            height: '100%',
            borderRadius: '3px',
            background: 'var(--accent, #2563eb)',
            transition: 'width 0.25s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <label 
          className="btn" 
          style={{ padding: '6px 12px', fontSize: '13px', margin: 0 }} 
          onClick={onRequestCancel}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onRequestCancel()}
        >
          분석 취소
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {stages.map((stage) => (
          <article key={stage.id} className="stage-card">
            <div className="flex-between">
              <span style={{ fontWeight: 600, fontSize: '16px' }}>{stage.title}</span>
              <span className={`status-badge ${stage.status}`}>{stage.status}</span>
            </div>
            <div className="log-box">
              {stage.logs.map((log, idx) => (
                <p key={idx} className="log-text">{log}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}