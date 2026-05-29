import type { MaskRenderStyle } from '../../shared/maskRenderStyle';
import { MASK_RENDER_STYLE_LABEL } from '../../shared/maskRenderStyle';
import type { NormalizedBbox, RiskReportData } from '../../shared/types';
import { IoImageOutline } from 'react-icons/io5';
import { InteractiveMaskImage } from './InteractiveMaskImage';

interface Props {
  report: RiskReportData;
  hasSourceImage: boolean;
  maskRenderStyle: MaskRenderStyle;
  onMaskRenderStyleChange: (style: MaskRenderStyle) => void;
  /** true이면 마스킹 적용 후 결과 미리보기 */
  showMaskedPreview: boolean;
  manualEditActive: boolean;
  onManualEditToggle: () => void;
  onAddManualRegion: (imageIndex: number, bbox: NormalizedBbox) => void;
  isApplying: boolean;
  maskError: string;
  isRetryingBbox: boolean;
  onToggleMask: (imageIndex: number, id: string) => void;
  onApplyMask: () => void;
  onDownload: () => void;
  onRetryBbox: () => void;
}

export function ImageMaskingPanel({
  report,
  hasSourceImage,
  showMaskedPreview,
  manualEditActive,
  onManualEditToggle,
  onAddManualRegion,
  isApplying,
  maskError,
  isRetryingBbox,
  maskRenderStyle,
  onMaskRenderStyleChange,
  onToggleMask,
  onApplyMask,
  onDownload,
  onRetryBbox,
}: Readonly<Props>) {
  const imageEntries =
    report.imageEntries && report.imageEntries.length > 0
      ? report.imageEntries
      : [
          {
            imagePreviewUrl: report.imagePreviewUrl,
            maskedImagePreviewUrl: report.maskedImagePreviewUrl,
            imageRiskSummary: report.imageRiskSummary,
            maskRegions: report.maskRegions,
          },
        ];
  const canApply =
    hasSourceImage &&
    imageEntries.some((entry) => entry.maskRegions.some((r) => r.checked)) &&
    !isApplying &&
    !manualEditActive;
  const canDownload = showMaskedPreview && imageEntries.some((entry) => Boolean(entry.maskedImagePreviewUrl));
  const unlocatedLabels = report.maskCandidateMeta?.unlocatedLabels;
  const buildNumberedLabels = (regions: RiskReportData['maskRegions']) => {
    const normalizeLabelKey = (label: string) => label.trim().toLowerCase();
    const totalByLabel = new Map<string, number>();
    for (const region of regions) {
      const key = normalizeLabelKey(region.label);
      totalByLabel.set(key, (totalByLabel.get(key) ?? 0) + 1);
    }
    const seenByLabel = new Map<string, number>();
    return regions.map((region) => {
      const key = normalizeLabelKey(region.label);
      const total = totalByLabel.get(key) ?? 0;
      const seen = (seenByLabel.get(key) ?? 0) + 1;
      seenByLabel.set(key, seen);
      return total > 1 ? `${region.label}${seen}` : region.label;
    });
  };

  return (
    <section className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: '0 0 8px 0' }}>
        <IoImageOutline size={18} /> 이미지 마스킹
      </h2>
      <div style={{ marginBottom: '12px' }}>
        <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px 0' }}>
          마스킹 방식
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['legacy', 'mosaic'] as const).map((style) => {
            const selected = maskRenderStyle === style;
            return (
              <button
                key={style}
                type="button"
                className="btn"
                disabled={isApplying || manualEditActive}
                onClick={() => onMaskRenderStyleChange(style)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  fontSize: '13px',
                  fontWeight: selected ? 700 : 500,
                  borderRadius: '12px',
                  border: `1px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
                  background: selected ? '#eff6ff' : '#f8fafc',
                  color: selected ? '#1d4ed8' : '#64748b',
                }}
              >
                {MASK_RENDER_STYLE_LABEL[style]}
              </button>
            );
          })}
        </div>
      </div>
      {manualEditActive && hasSourceImage && (
        <p style={{ fontSize: '12px', color: '#1d4ed8', margin: '0 0 10px 0', lineHeight: 1.5 }}>
          이미지 위를 드래그해 블러·모자이크할 영역을 추가하세요. ({MASK_RENDER_STYLE_LABEL[maskRenderStyle]} 적용)
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '12px' }}>
        {imageEntries.map((entry, imageIndex) => {
          const previewUrl =
            entry.maskedImagePreviewUrl && (showMaskedPreview || manualEditActive)
              ? entry.maskedImagePreviewUrl
              : entry.imagePreviewUrl;
          const numberedMaskLabels = buildNumberedLabels(entry.maskRegions);
          return (
            <div key={`mask-image-${imageIndex}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <InteractiveMaskImage
                src={previewUrl}
                regions={entry.maskRegions}
                manualEditActive={manualEditActive && hasSourceImage}
                disabled={isApplying || !hasSourceImage}
                onAddRegion={(bbox) => onAddManualRegion(imageIndex, bbox)}
              />
              {entry.maskRegions.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {entry.maskRegions.map((mask, index) => (
                    <label
                      key={mask.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        background: mask.checked ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${mask.checked ? '#3b82f6' : '#e2e8f0'}`,
                        borderRadius: '12px',
                        cursor: hasSourceImage && !manualEditActive ? 'pointer' : 'not-allowed',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: mask.checked ? '#1d4ed8' : '#64748b',
                        opacity: hasSourceImage && !manualEditActive ? 1 : 0.6,
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{ marginRight: '8px' }}
                        checked={mask.checked}
                        disabled={!hasSourceImage || manualEditActive}
                        onChange={() => onToggleMask(imageIndex, mask.id)}
                      />
                      {numberedMaskLabels[index]}
                      {mask.source === 'user' && (
                        <span style={{ marginLeft: '4px', fontSize: '11px', color: '#64748b' }}>(직접)</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {isApplying && (
        <p className="muted" style={{ fontSize: '12px', margin: '0 0 12px 0' }}>
          마스킹 적용 중...
        </p>
      )}
      {!showMaskedPreview && !isApplying && hasSourceImage && !manualEditActive && (
        <p className="muted" style={{ fontSize: '12px', margin: '0 0 12px 0' }}>
          원본 이미지입니다. 항목을 선택한 뒤 「마스킹 적용」을 누르면 결과를 확인할 수 있습니다.
        </p>
      )}
      {showMaskedPreview && !isApplying && !manualEditActive && (
        <p className="muted" style={{ fontSize: '12px', margin: '0 0 12px 0' }}>
          마스킹이 적용된 미리보기입니다. 다시 적용하면 선택 항목 기준으로 갱신됩니다.
        </p>
      )}
      {!hasSourceImage && (
        <p className="muted" style={{ fontSize: '13px', margin: '0 0 12px 0' }}>
          분석에 사용한 원본 이미지가 없어 마스킹을 적용할 수 없습니다.
        </p>
      )}
      {imageEntries.every((entry) => entry.maskRegions.length === 0) && hasSourceImage && !manualEditActive && (
        <p style={{ fontSize: '13px', color: '#b45309', margin: '0 0 12px 0', lineHeight: 1.5 }}>
          마스킹할 bbox가 있는 항목이 없습니다. 「직접 수정」으로 영역을 추가하거나, Gemma imageRisks에 bbox가
          포함돼야 체크박스가 생깁니다.
        </p>
      )}
      {unlocatedLabels && unlocatedLabels.length > 0 && !manualEditActive && (
        <>
          <p style={{ fontSize: '12px', color: '#b45309', margin: '0 0 8px 0', lineHeight: 1.5 }}>
            탐지됐으나 bbox 없음: {unlocatedLabels.join(', ')} (OwlViT도 실패 시 영역 미생성)
          </p>
          <button
            className="btn-text"
            type="button"
            onClick={onRetryBbox}
            disabled={!hasSourceImage || isRetryingBbox || manualEditActive}
            style={{ marginBottom: '12px' }}
          >
            {isRetryingBbox ? 'bbox 재탐지 중...' : 'bbox 다시 찾기'}
          </button>
        </>
      )}
      {maskError && (
        <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 12px 0' }}>{maskError}</p>
      )}
      <button
        type="button"
        disabled={!hasSourceImage || isApplying}
        onClick={onManualEditToggle}
        style={{
          width: '100%',
          marginBottom: '10px',
          padding: '12px',
          fontSize: '14px',
          fontWeight: manualEditActive ? 700 : 600,
          borderRadius: '12px',
          border: `1px solid ${manualEditActive ? '#3b82f6' : '#cbd5e1'}`,
          background: manualEditActive ? '#eff6ff' : '#f8fafc',
          color: manualEditActive ? '#1d4ed8' : '#0f172a',
          cursor: !hasSourceImage || isApplying ? 'not-allowed' : 'pointer',
          opacity: !hasSourceImage || isApplying ? 0.5 : 1,
        }}
      >
        {manualEditActive ? '직접 수정 완료' : '직접 수정'}
      </button>
      <div className="row-gap" style={{ marginBottom: '4px' }}>
        <label
          className="btn"
          role="button"
          onClick={canApply ? onApplyMask : undefined}
          style={{
            opacity: canApply ? 1 : 0.5,
            cursor: canApply ? 'pointer' : 'not-allowed',
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
            cursor: canDownload ? 'pointer' : 'not-allowed',
          }}
        >
          다운로드
        </label>
      </div>
    </section>
  );
}
