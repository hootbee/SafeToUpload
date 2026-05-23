import type { RiskReportData } from '../../shared/types';
import { imageRiskSummaryForCategories } from '../../services/maskCategoryUtils';
import { IoImageOutline } from 'react-icons/io5';
import { ImagePreviewBox } from './ImagePreviewBox';

interface Props {
  report: RiskReportData;
  hasSourceImage: boolean;
  /** true이면 마스킹 적용 후 결과 미리보기 */
  showMaskedPreview: boolean;
  isApplying: boolean;
  maskError: string;
  onToggleMask: (id: string) => void;
  onApplyMask: () => void;
  onDownload: () => void;
}

export function ImageMaskingPanel({
  report,
  hasSourceImage,
  showMaskedPreview,
  isApplying,
  maskError,
  onToggleMask,
  onApplyMask,
  onDownload,
}: Props) {
  const previewUrl =
    showMaskedPreview && report.maskedImagePreviewUrl
      ? report.maskedImagePreviewUrl
      : report.imagePreviewUrl;
  const canApply = hasSourceImage && report.maskRegions.some((r) => r.checked) && !isApplying;
  const canDownload = showMaskedPreview && Boolean(report.maskedImagePreviewUrl);
  const skipped = report.maskCandidateMeta?.skippedCategories;

  return (
    <section className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: '0 0 16px 0' }}>
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
          마스킹할 수 있는 항목이 없습니다. 다른 이미지로 다시 분석해 보세요.
        </p>
      )}
      {report.maskRegions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          {report.maskRegions.map((mask) => (
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
              {mask.label}
            </label>
          ))}
        </div>
      )}
      {skipped && skipped.length > 0 && (
        <p style={{ fontSize: '12px', color: '#b45309', margin: '0 0 12px 0', lineHeight: 1.5 }}>
          {imageRiskSummaryForCategories(skipped)} — 자동 위치를 찾지 못해{' '}
          <strong>추정 영역(폴백)</strong>으로 표시했습니다. 적용 전 미리보기로 범위를 확인하세요.
        </p>
      )}
      {maskError && (
        <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 12px 0' }}>{maskError}</p>
      )}
      <div className="row-gap">
        <button className="btn" type="button" disabled={!canApply} onClick={onApplyMask}>
          {isApplying ? '적용 중...' : '마스킹 적용'}
        </button>
        <button className="btn primary" type="button" disabled={!canDownload} onClick={onDownload}>
          다운로드
        </button>
      </div>
    </section>
  );
}
