import type { AnalysisStage } from '../../shared/types';
import { LuActivity } from "react-icons/lu";

interface Props {
  stages: AnalysisStage[];
  currentStageTitle: string;
  onRequestCancel: () => void;
}

export function AgentProgress({ stages, currentStageTitle, onRequestCancel }: Props) {
  return (
    <section className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LuActivity size={18} />
        Agent 분석 중
      </h2>
      <p className="muted" style={{ fontSize: '14px', marginBottom: '15px' }}>
        현재 단계: <strong>{currentStageTitle}</strong>
      </p>
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
