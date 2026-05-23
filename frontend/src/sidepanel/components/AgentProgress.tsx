import type { AnalysisStage } from '../../shared/types';
import { LuActivity } from 'react-icons/lu';

interface Props {
  stages: AnalysisStage[];
  currentStageTitle: string;
  progress: number;
  onRequestCancel: () => void;
}

const STATUS_LABEL: Record<AnalysisStage['status'], string> = {
  pending: '대기',
  running: '진행 중',
  done: '완료',
};

export function AgentProgress({ stages, currentStageTitle, progress, onRequestCancel }: Props) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <section className="card agent-progress">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LuActivity size={18} />
        Agent 분석 중
      </h2>
      <p className="muted" style={{ fontSize: '14px', marginBottom: '8px' }}>
        현재 단계: <strong>{currentStageTitle}</strong>
      </p>

      <div className="analysis-progress-bar-wrap" aria-label="전체 분석 진행률">
        <div className="analysis-progress-bar" style={{ width: `${clampedProgress}%` }} />
      </div>
      <p className="analysis-progress-pct">{clampedProgress}%</p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '12px 0 16px' }}>
        <button
          className="btn"
          type="button"
          style={{ padding: '6px 12px', fontSize: '13px', margin: 0 }}
          onClick={onRequestCancel}
        >
          분석 취소
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {stages.map((stage) => (
          <article
            key={stage.id}
            className={`stage-card${stage.status === 'running' ? ' stage-card--active' : ''}`}
          >
            <div className="flex-between">
              <span style={{ fontWeight: 600, fontSize: '16px' }}>{stage.title}</span>
              <span className={`status-badge ${stage.status}`}>{STATUS_LABEL[stage.status]}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
