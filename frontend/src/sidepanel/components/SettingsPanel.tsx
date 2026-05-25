import type { CSSProperties } from 'react';
import type { InferenceMode, Platform, ServerLlmSettings, SettingsState } from '../../shared/types';
import { TbSettings, TbShare, TbAdjustmentsHorizontal, TbDatabase, TbBell, TbTrash, TbServer } from "react-icons/tb";
import { InferenceModeSelector } from './InferenceModeSelector';

interface Props {
  settings: SettingsState;
  onInferenceMode: (mode: InferenceMode) => void;
  onTogglePlatform: (platform: Platform) => void;
  onSensitivity: (value: number) => void;
  onRetention: (value: 7 | 30 | 90) => void;
  onToggleNotification: () => void;
  onServerLlmChange: (patch: Partial<ServerLlmSettings>) => void;
  onPrivacyMemoryEnabled: (enabled: boolean) => void;
  onPrivacyMemoryRetention: (days: number) => void;
  onPrivacyMemoryBlocking: (enabled: boolean) => void;
  onPrivacyMemoryScoreBoost: (enabled: boolean) => void;
  onDeletePrivacyMemory: () => void;
  onClearAll: () => void;
}

const fieldLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#64748b',
  marginBottom: '6px',
};

const fieldInputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  fontSize: '13px',
  fontFamily: 'inherit',
};

export function SettingsPanel({
  settings,
  onInferenceMode,
  onTogglePlatform,
  onSensitivity,
  onRetention,
  onToggleNotification,
  onServerLlmChange,
  onPrivacyMemoryEnabled,
  onPrivacyMemoryRetention,
  onPrivacyMemoryBlocking,
  onPrivacyMemoryScoreBoost,
  onDeletePrivacyMemory,
  onClearAll,
}: Props) {
  const retentionOptions = [7, 30, 90] as const;
  const percentage = ((settings.sensitivity - 1) / 9) * 100;

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: 0 }}>
        <TbSettings size={20} /> 설정
      </h2>
      <InferenceModeSelector value={settings.inferenceMode} onChange={onInferenceMode} />
      {settings.inferenceMode === 'server' && (
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', margin: '5px 0 12px 0' }}>
            <TbServer size={18} /> 서버 LLM (Chat Completions)
          </h3>
          <p className="muted" style={{ fontSize: '12px', margin: '0 0 12px 0', lineHeight: 1.5 }}>
            Open WebUI 형식 API입니다. API 키는 아래에 입력하거나 서버 <code>server/.env</code>의{' '}
            <code>AI_LLM_API_KEY</code>에 설정할 수 있습니다.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label>
              <span style={fieldLabelStyle}>API URL</span>
              <input
                type="url"
                value={settings.serverLlm.chatUrl}
                onChange={(e) => onServerLlmChange({ chatUrl: e.target.value })}
                placeholder="https://.../api/chat/completions"
                style={fieldInputStyle}
              />
            </label>
            <label>
              <span style={fieldLabelStyle}>모델</span>
              <input
                type="text"
                value={settings.serverLlm.model}
                onChange={(e) => onServerLlmChange({ model: e.target.value })}
                placeholder="gemma4:26b"
                style={fieldInputStyle}
              />
            </label>
            <label>
              <span style={fieldLabelStyle}>API 키</span>
              <input
                type="password"
                value={settings.serverLlm.apiKey}
                onChange={(e) => onServerLlmChange({ apiKey: e.target.value })}
                placeholder="Bearer 토큰 (비워두면 서버 env 사용)"
                autoComplete="off"
                style={fieldInputStyle}
              />
            </label>
          </div>
        </div>
      )}
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', margin: '5px 0 12px 0' }}>
          <TbShare size={18} /> 감지 대상 SNS
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {(Object.keys(settings.platforms) as Platform[]).map((p) => {
            const isActive = settings.platforms[p];
            return (
              <label
                key={p}
                style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: isActive ? '#eff6ff' : '#f8fafc', border: `1px solid ${isActive ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: isActive ? 600 : 500, color: isActive ? '#1d4ed8' : '#64748b', transition: 'all 0.2s' }}
              >
                <input type="checkbox" checked={isActive} onChange={() => onTogglePlatform(p)} style={{ marginRight: '8px', cursor: 'pointer' }} />
                {p.toUpperCase()}
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', margin: '10px 0 12px 0' }}>
          <TbAdjustmentsHorizontal size={18} /> 위험도 민감도: {settings.sensitivity}
        </h3>
        <input type="range" min={1} max={10} value={settings.sensitivity} onChange={(e) => onSensitivity(Number(e.target.value))} className="custom-slider" style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)` }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
          <span>낮음</span>
          <span>높음</span>
        </div>
      </div>
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', margin: '10px 0 12px 0' }}>
          <TbDatabase size={18} /> 데이터 보관 기간
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {retentionOptions.map((days) => {
            const isActive = settings.retentionDays === days;
            return (
              <label
                key={days}
                role="button"
                tabIndex={0}
                onClick={() => onRetention(days)}
                onKeyDown={(e) => e.key === 'Enter' && onRetention(days)}
                style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: isActive ? '#3b82f6' : '#f1f5f9', color: isActive ? '#ffffff' : '#64748b', borderRadius: '12px', fontSize: '13px', fontWeight: isActive ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {days}일
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', margin: '0 0 8px 0' }}>
          <TbDatabase size={18} /> Privacy Memory
        </h3>
        <p className="muted" style={{ fontSize: '12px', margin: '0 0 12px 0', lineHeight: 1.5 }}>
          개인정보 원문은 저장하지 않고, 위험 유형·문맥·조합 패턴만 저장합니다.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Privacy Memory 사용</span>
          <div className="custom-toggle">
            <input
              type="checkbox"
              checked={settings.privacyMemoryEnabled}
              onChange={() => onPrivacyMemoryEnabled(!settings.privacyMemoryEnabled)}
              className="toggle-checkbox"
            />
            <span className="toggle-slider" />
          </div>
        </label>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>보관 기간 (일)</p>
        <input
          type="number"
          min={1}
          max={365}
          value={settings.privacyMemoryRetentionDays}
          onChange={(e) => onPrivacyMemoryRetention(Number(e.target.value) || 90)}
          style={fieldInputStyle}
        />
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginTop: '12px' }}>
          <span style={{ fontSize: '13px' }}>점수 상향 사용</span>
          <input
            type="checkbox"
            checked={settings.privacyMemoryUseForScoreBoost}
            onChange={() => onPrivacyMemoryScoreBoost(!settings.privacyMemoryUseForScoreBoost)}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginTop: '8px' }}>
          <span style={{ fontSize: '13px' }}>업로드 차단 사용</span>
          <input
            type="checkbox"
            checked={settings.privacyMemoryUseForBlocking}
            onChange={() => onPrivacyMemoryBlocking(!settings.privacyMemoryUseForBlocking)}
          />
        </label>
        <label
          className="btn"
          role="button"
          tabIndex={0}
          onClick={onDeletePrivacyMemory}
          onKeyDown={(e) => e.key === 'Enter' && onDeletePrivacyMemory()}
          style={{ display: 'block', textAlign: 'center', marginTop: '12px', padding: '10px' }}
        >
          Privacy Memory 전체 삭제
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '4px' }}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', margin: 0 }}>
            <TbBell size={18} /> 알림 받기
          </h3>
          <div className="custom-toggle">
            <input 
              type="checkbox" 
              checked={settings.notifications} 
              onChange={onToggleNotification} 
              className="toggle-checkbox"
            />
            <span className="toggle-slider"></span>
          </div>
        </label>
        <label 
          className="btn danger" 
          role="button" 
          tabIndex={0} 
          onClick={onClearAll} 
          onKeyDown={(e) => e.key === 'Enter' && onClearAll()}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '14px', width: '100%', boxSizing: 'border-box', borderRadius: '25px' }}
        >
          <TbTrash size={18} /> 전체 기록 삭제
        </label>
      </div>
    </section>
  );
}