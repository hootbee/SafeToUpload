import type { HistoryItem } from '../../shared/types';
import { TbHistory, TbCalendar, TbShare } from "react-icons/tb";

type FilterKey = 'all' | 'low' | 'medium' | 'high' | 'critical';

interface Props {
  items: HistoryItem[];
  filter: FilterKey;
  onFilter: (value: FilterKey) => void;
  onSelectItem?: (id: string) => void;
}

interface FilterOption {
  key: FilterKey;
  label: string;
  color?: string; 
}

export function HistoryList({ items, filter, onFilter, onSelectItem }: Props) {
  const filterOptions: FilterOption[] = [
    { key: 'all', label: '전체 보기', color: '#3182F6' },
    { key: 'critical', label: '치명', color: '#B91C1C' },
    { key: 'high', label: '높음', color: '#EF4444' },
    { key: 'medium', label: '보통', color: '#F59E0B' },
    { key: 'low', label: '낮음', color: '#10B981' },
  ];

  return (
    <section className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: '0 0 16px 0' }}>
        <TbHistory size={20} /> 분석 이력
      </h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {filterOptions.map((f) => (
          <label
            key={f.key}
            role="button"
            tabIndex={0}
            onClick={() => onFilter(f.key)}
            onKeyDown={(e) => e.key === 'Enter' && onFilter(f.key)}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: filter === f.key ? 700 : 500,
              background: filter === f.key ? (f.color || '#1e293b') : '#f1f5f9',
              color: filter === f.key ? '#fff' : '#64748b',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              userSelect: 'none'
            }}
          >
            {f.label}
          </label>
        ))}
      </div>
      <div 
        className="history-scroll-area"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          maxHeight: '628px',
          overflowY: 'auto',
          paddingRight: '8px'
        }}
      >
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' }}>
            해당하는 분석 이력이 없습니다.
          </div>
        ) : (
          items.map((item) => {
            const isCritical = item.riskLevel === 'critical';
            const isHigh = item.riskLevel === 'high';
            const isMed = item.riskLevel === 'medium';
            const badgeColor = isCritical ? '#B91C1C' : isHigh ? '#EF4444' : isMed ? '#F59E0B' : '#10B981';
            const badgeBg = isCritical ? '#FEE2E2' : isHigh ? '#FEE2E2' : isMed ? '#FEF3C7' : '#D1FAE5';
            const badgeText = isCritical
              ? '치명'
              : isHigh
                ? '위험 높음'
                : isMed
                  ? '위험 보통'
                  : '위험 낮음';

            return (
              <article
                key={item.id}
                role={onSelectItem ? 'button' : undefined}
                tabIndex={onSelectItem ? 0 : undefined}
                onClick={onSelectItem ? () => onSelectItem(item.id) : undefined}
                onKeyDown={
                  onSelectItem
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectItem(item.id);
                        }
                      }
                    : undefined
                }
                style={{
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  cursor: onSelectItem ? 'pointer' : 'default',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
                      <TbCalendar size={14} />
                      {item.date}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
                      <TbShare size={14} />
                      {item.platform.toUpperCase()}
                    </div>
                  </div>
                  <span style={{ background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>
                    {badgeText}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                  {item.summary}
                </p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}