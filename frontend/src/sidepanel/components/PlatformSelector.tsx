import { PLATFORM_OPTIONS } from '../../shared/constants';
import type { Platform } from '../../shared/types';

interface Props {
  value: Platform;
  onChange: (value: Platform) => void;
}

export function PlatformSelector({ value, onChange }: Props) {
  return (
    <section className="card">
      <h3>A-01 플랫폼 선택</h3>
      <div className="chip-row">
        {PLATFORM_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip ${value === option.value ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
