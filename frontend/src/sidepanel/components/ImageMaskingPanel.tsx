import type { RiskReportData } from '../../shared/types';
import { IoImageOutline } from 'react-icons/io5';
import { ImagePreviewBox } from './ImagePreviewBox';

interface Props {
  report: RiskReportData;
  hasSourceImage: boolean;
  /** true이면 마스킹 적용 후 결과 미리보기 */
  showMaskedPreview: boolean;
  isApplying: boolean;
  maskError: string;
  isRetryingBbox: boolean;
  onToggleMask: (id: string) => void;
  onApplyMask: () => void;
  onDownload: () => void;
  onRetryBbox: () => void;
}

export function ImageMaskingPanel({
  report,
  hasSourceImage,
  showMaskedPreview,
  isApplying,
  maskError,
  isRetryingBbox,
  onToggleMask,
  onApplyMask,
  onDownload,
  onRetryBbox,
}: Readonly<Props>) {
  const previewUrl =
    showMaskedPreview && report.maskedImagePreviewUrl
      ? report.maskedImagePreviewUrl
      : report.imagePreviewUrl;
  const canApply = hasSourceImage && report.maskRegions.some((r) => r.checked) && !isApplying;
  const canDownload = showMaskedPreview && Boolean(report.maskedImagePreviewUrl);
  const unlocatedLabels = report.maskCandidateMeta?.unlocatedLabels;
  const numberedMaskLabels = (() => {
    const normalizeLabelKey = (label: string) => label.trim().toLowerCase();
    const totalByLabel = new Map<string, number>();
    for (const region of report.maskRegions) {
      const key = normalizeLabelKey(region.label);
      totalByLabel.set(key, (totalByLabel.get(key) ?? 0) + 1);
    }

    const seenByLabel = new Map<string, number>();
    return report.maskRegions.map((region) => {
      const key = normalizeLabelKey(region.label);
      const total = totalByLabel.get(key) ?? 0;
      const seen = (seenByLabel.get(key) ?? 0) + 1;
      seenByLabel.set(key, seen);
      return total > 1 ? `${region.label}${seen}` : region.label;
    });
  })();

  return (
    <section className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: '0 0 8px 0' }}>
        <IoImageOutline size={18} /> 이미지 마스킹
      </h2>
      <div style={{ marginBottom: '12px' }}>
        <ImagePreviewBox src={previewUrl} height={160} />
      </div>
      {isApplying && (
        <p className="muted" style={{ fontSize: '12px', margin: '0 0 12px 0' }}>
          마스킹 적용 중...
        </p>
      )}
      {!showMaskedPreview && !isApplying && hasSourceImage && (
        <p className="muted" style={{ fontSize: '12px', margin: '0 0 12px 0' }}>
          원본 이미지입니다. 항목을 선택한 뒤 「마스킹 적용」을 누르면 결과를 확인할 수 있습니다.
        </p>
      )}
      {showMaskedPreview && report.maskedImagePreviewUrl && !isApplying && (
        <p className="muted" style={{ fontSize: '12px', margin: '0 0 12px 0' }}>
          마스킹이 적용된 미리보기입니다. 다시 적용하면 선택 항목 기준으로 갱신됩니다.
        </p>
      )}
      {!hasSourceImage && (
        <p className="muted" style={{ fontSize: '13px', margin: '0 0 12px 0' }}>
          분석에 사용한 원본 이미지가 없어 마스킹을 적용할 수 없습니다.
        </p>
      )}
      {report.maskRegions.length === 0 && hasSourceImage && (
        <p style={{ fontSize: '13px', color: '#b45309', margin: '0 0 12px 0', lineHeight: 1.5 }}>
          마스킹할 bbox가 있는 항목이 없습니다. Gemma imageRisks에 bbox가 포함돼야 체크박스가
          생깁니다. LLM 원문을 확인하세요.
        </p>
      )}
      {unlocatedLabels && unlocatedLabels.length > 0 && (
        <>
          <p style={{ fontSize: '12px', color: '#b45309', margin: '0 0 8px 0', lineHeight: 1.5 }}>
            탐지됐으나 bbox 없음: {unlocatedLabels.join(', ')} (OwlViT도 실패 시 영역 미생성)
          </p>
          <button
            className="btn-text"
            type="button"
            onClick={onRetryBbox}
            disabled={!hasSourceImage || isRetryingBbox}
            style={{ marginBottom: '12px' }}
          >
            {isRetryingBbox ? 'bbox 재탐지 중...' : 'bbox 다시 찾기'}
          </button>
        </>
      )}
      {report.maskRegions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          {report.maskRegions.map((mask, index) => (
            <label
              key={mask.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                background: mask.checked ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${mask.checked ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '12px',
                cursor: hasSourceImage ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: 500,
                color: mask.checked ? '#1d4ed8' : '#64748b',
                opacity: hasSourceImage ? 1 : 0.6,
              }}
            >
              <input
                type="checkbox"
                style={{ marginRight: '8px' }}
                checked={mask.checked}
                disabled={!hasSourceImage}
                onChange={() => onToggleMask(mask.id)}
              />
              {numberedMaskLabels[index]}
            </label>
          ))}
        </div>
      )}
      {maskError && (
        <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 12px 0' }}>{maskError}</p>
      )}
      <div className="row-gap">
        <label 
          className="btn" 
          role="button" 
          onClick={canApply ? onApplyMask : undefined}
          style={{ 
            opacity: canApply ? 1 : 0.5, 
            cursor: canApply ? 'pointer' : 'not-allowed' 
          }}
        >
          {isApplying ? '적용 중...' : '마스킹 적용'}
        </label>
        <label 
          className="btn primary" 
          role="button" 
          onClick={canDownload ? onDownload : undefined}
          style={{ 
            opacity: canDownload ? 1 : 0.5, 
            cursor: canDownload ? 'pointer' : 'not-allowed' 
          }}
        >
          다운로드
        </label>
      </div>
    </section>
  );
}
 