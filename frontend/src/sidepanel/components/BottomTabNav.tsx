import type { TabKey } from '../../shared/types';
import { TbHome, TbHistory, TbSettings } from "react-icons/tb";

interface Props {
  current: TabKey;
  onChange: (tab: TabKey) => void;
}

export function BottomTabNav({ current, onChange }: Props) {
  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'home', label: 'Home', icon: <TbHome size={24} /> },
    { key: 'history', label: 'History', icon: <TbHistory size={24} /> },
    { key: 'settings', label: 'Settings', icon: <TbSettings size={24} /> },
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
          <div className="tab-content">
            {tab.icon}
            <span className="tab-label">{tab.label}</span>
          </div>
        </button>
      ))}
    </nav>
  );
}
