import type { InferenceMode } from '../../shared/types';
import { LOCAL_MODEL_ID, OFFICIAL_LOCAL_MODEL_REF, SERVER_MODEL_ID } from '../../config/models';

interface Props {
  value: InferenceMode;
  onChange: (mode: InferenceMode) => void;
}

export function InferenceModeSelector({ value, onChange }: Props) {
  return (
    <section className="card">
      <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700 }}>AI 추론 모드</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: '12px' }}>
        로컬: WebGPU + Gemma4 E4B · 서버: Gemma4 26B
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '12px',
            borderRadius: '12px',
            border: `1px solid ${value === 'local' ? '#3b82f6' : '#e2e8f0'}`,
            background: value === 'local' ? '#eff6ff' : '#f8fafc',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <input
              type="radio"
              name="inferenceMode"
              checked={value === 'local'}
              onChange={() => onChange('local')}
            />
            로컬 (E4B / WebGPU)
          </span>
          <span className="muted" style={{ fontSize: '12px', paddingLeft: '24px' }}>
            ONNX: {LOCAL_MODEL_ID}
            <br />
            공식: {OFFICIAL_LOCAL_MODEL_REF}
          </span>
        </label>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '12px',
            borderRadius: '12px',
            border: `1px solid ${value === 'server' ? '#3b82f6' : '#e2e8f0'}`,
            background: value === 'server' ? '#eff6ff' : '#f8fafc',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <input
              type="radio"
              name="inferenceMode"
              checked={value === 'server'}
              onChange={() => onChange('server')}
            />
            서버 (26B)
          </span>
          <span className="muted" style={{ fontSize: '12px', paddingLeft: '24px' }}>
            {SERVER_MODEL_ID} · 중앙 AI 서버 경유
          </span>
        </label>
      </div>
    </section>
  );
}
