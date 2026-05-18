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
    <section className="card">
      <h3>C-01 모델 로드 & 진행</h3>
      <p className="muted">상태: {status}</p>
      {status === 'not-loaded' && (
        <button type="button" className="btn" onClick={onLoadModel}>
          AI 모델 불러오기
        </button>
      )}
      {status === 'loading' && (
        <>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="muted">{progress}%</p>
        </>
      )}
      {status === 'ready' && <p>모델 준비 완료 (mock)</p>}
      {status === 'error' && (
        <div className="error-box">
          <strong>G-02 권한/환경 오류 안내</strong>
          <p>{errorMessage || 'WebGPU 미지원 또는 권한 부족 (mock)'}</p>
          <p className="muted">CPU 모드 폴백 안내: 느릴 수 있지만 분석은 가능하도록 설계 예정</p>
          <button type="button" className="btn" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      )}
    </section>
  );
}
