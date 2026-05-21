import type { Platform, SettingsState } from '../../shared/types';
import { TbSettings, TbShare, TbAdjustmentsHorizontal, TbDatabase, TbBell, TbTrash } from "react-icons/tb";

interface Props {
  settings: SettingsState;
  onTogglePlatform: (platform: Platform) => void;
  onSensitivity: (value: number) => void;
  onRetention: (value: 7 | 30 | 90) => void;
  onToggleNotification: () => void;
  onClearAll: () => void;
}

export function SettingsPanel({
  settings,
  onTogglePlatform,
  onSensitivity,
  onRetention,
  onToggleNotification,
  onClearAll,
}: Props) {
  const retentionOptions = [7, 30, 90] as const;
  const percentage = ((settings.sensitivity - 1) / 9) * 100;

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: 0 }}>
        <TbSettings size={20} /> 설정
      </h2>
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