import { TbArrowLeft } from "react-icons/tb";

export function AppHeader({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0' }}>
      <button 
        onClick={onBack} 
        className="back-btn"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
      >
        <TbArrowLeft size={24} />
      </button>
      <h1 className="logo-title" style={{ margin: 0 }}>AI PRIVACY GUARD</h1>
    </div>
  );
}