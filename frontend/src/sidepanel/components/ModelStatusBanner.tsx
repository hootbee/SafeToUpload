import type { ModelStatus } from '../../shared/types';
import { RiRobot2Line } from "react-icons/ri";

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
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RiRobot2Line size={18} />
          AI 분석 모델 상태
        </h3>
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
          <strong style={{ fontSize: '14px' }}>권한 및 환경 오류 안내</strong>
          <p className="muted" style={{ color: '#c81e1e' }}>
            {errorMessage || 'WebGPU 미지원 또는 권한이 부족합니다.'}
          </p>
          <p className="muted">WebGPU·Hugging Face 접근(manifest, VITE_HF_TOKEN)을 확인한 뒤 다시 시도하세요.</p>
          <label
            role="button"
            className="btn danger"
            onClick={onRetry}
            style={{ alignSelf: 'flex-start' }}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onRetry()}
            >
            다시 시도
          </label>
        </div>
      )}
    </section>
  );
}