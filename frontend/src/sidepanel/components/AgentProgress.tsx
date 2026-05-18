import type { AnalysisStage } from '../../shared/types';

interface Props {
  stages: AnalysisStage[];
  currentStageTitle: string;
  onRequestCancel: () => void;
}

export function AgentProgress({ stages, currentStageTitle, onRequestCancel }: Props) {
  return (
    <section className="card">
      <h2>C-02 Agent 분석 중</h2>
      <p className="muted">현재 단계: {currentStageTitle}</p>
      {stages.map((stage) => (
        <article key={stage.id} className="stage-card">
          <p>
            {stage.title} - {stage.status}
          </p>
          <div className="log-box">
            {stage.logs.map((log, idx) => (
              <p key={idx}>{log}</p>
            ))}
          </div>
        </article>
      ))}
      <button className="btn" type="button" onClick={onRequestCancel}>
        분석 취소
      </button>
    </section>
  );
}
