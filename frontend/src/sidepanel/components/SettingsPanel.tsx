import type { Platform, SettingsState } from '../../shared/types';

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
  return (
    <section className="card">
      <h2>A-03 설정</h2>
      <h3>감지 대상 SNS</h3>
      <div className="check-grid">
        {(Object.keys(settings.platforms) as Platform[]).map((p) => (
          <label key={p}>
            <input type="checkbox" checked={settings.platforms[p]} onChange={() => onTogglePlatform(p)} /> {p}
          </label>
        ))}
      </div>
      <h3>위험도 민감도: {settings.sensitivity}</h3>
      <input type="range" min={1} max={10} value={settings.sensitivity} onChange={(e) => onSensitivity(Number(e.target.value))} />
      <h3>데이터 보관</h3>
      <select value={settings.retentionDays} onChange={(e) => onRetention(Number(e.target.value) as 7 | 30 | 90)}>
        <option value={7}>7일</option>
        <option value={30}>30일</option>
        <option value={90}>90일</option>
      </select>
      <label>
        <input type="checkbox" checked={settings.notifications} onChange={onToggleNotification} /> 알림 받기
      </label>
      <button className="btn danger" type="button" onClick={onClearAll}>
        전체 기록 삭제
      </button>
    </section>
  );
}
