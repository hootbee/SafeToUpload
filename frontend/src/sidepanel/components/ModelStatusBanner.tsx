import type { ModelStatus } from '../../shared/types';

interface Props {
  status: ModelStatus;
  progress: number;
  errorMessage?: string;
  onLoadModel: () => void;
  onRetry: () => void;
}

export function ModelStatusBanner({ status, progress, errorMessage, onLoadModel, onRetry }: Props) {
  return (
    <section className="card model-banner">
      <div className="model-banner-header">
        <h3>AI 분석 모델 상태</h3>
        <span className={`status-badge ${status}`}>
          {status === 'not-loaded' && '대기중'}
          {status === 'loading' && '로딩중'}
          {status === 'ready' && '준비완료'}
          {status === 'error' && '연결오류'}
        </span>
      </div>

      {status === 'not-loaded' && (
        <>
          <p className="muted">안전한 점검을 위해 AI 모델을 불러옵니다.</p>
          <label className="btn" onClick={onLoadModel} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            AI 모델 불러오기
          </label>
        </>
      )}

      {status === 'loading' && (
        <div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="muted" style={{ textAlign: 'right', marginTop: '4px' }}>{progress}%</p>
        </div>
      )}

      {status === 'ready' && <p className="muted">모델 준비가 완료되었습니다.</p>}

      {status === 'error' && (
        <div className="error-box">
          <strong>권한 및 환경 오류 안내</strong>
          <p className="muted" style={{ color: '#c81e1e' }}>
            {errorMessage || 'WebGPU 미지원 또는 권한이 부족합니다.'}
          </p>
          <p className="muted">CPU 모드로 전환하여 느리게 분석을 진행합니다.</p>
          <button type="button" className="btn danger" onClick={onRetry} style={{ alignSelf: 'flex-start' }}>
            다시 시도
          </button>
        </div>
      )}
    </section>
  );
}