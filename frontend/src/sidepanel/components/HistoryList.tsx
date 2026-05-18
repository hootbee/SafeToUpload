import type { HistoryItem } from '../../shared/types';

interface Props {
  items: HistoryItem[];
  filter: 'all' | 'low' | 'medium' | 'high';
  onFilter: (value: 'all' | 'low' | 'medium' | 'high') => void;
}

export function HistoryList({ items, filter, onFilter }: Props) {
  return (
    <section className="card">
      <h2>A-02 분석 이력</h2>
      <div className="chip-row">
        {(['all', 'low', 'medium', 'high'] as const).map((f) => (
          <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} onClick={() => onFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <div className="list">
        {items.map((item) => (
          <article key={item.id} className="list-item">
            <p>{item.date}</p>
            <p>{item.platform}</p>
            <p>위험: {item.riskLevel}</p>
            <p className="muted">{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
