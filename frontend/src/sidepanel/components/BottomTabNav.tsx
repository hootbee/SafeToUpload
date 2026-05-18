import type { TabKey } from '../../shared/types';

interface Props {
  current: TabKey;
  onChange: (tab: TabKey) => void;
}

export function BottomTabNav({ current, onChange }: Props) {
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'home', label: 'Home' },
    { key: 'history', label: 'History' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab-btn ${current === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
