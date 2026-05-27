import exifr from 'exifr';

type ExifRecord = Record<string, unknown>;

const NONE_MARKERS = ['없음', 'none', 'no exif', 'n/a', 'not available', '없습니다'];

function isMeaningful(value: unknown): boolean {
  if (value == null) return false;
  const text = String(value).trim();
  if (!text) return false;
  const lowered = text.toLowerCase();
  return !NONE_MARKERS.some((marker) => lowered.includes(marker));
}

function makeItem(type: string, label: string, value: unknown, severity = 'medium'): ExifRecord | null {
  if (!isMeaningful(value)) return null;
  return {
    type,
    label,
    severity,
    value: String(value),
    description: `${label}: ${String(value)}`,
  };
}

function toGpsString(parsed: ExifRecord): string | null {
  const latitude = parsed.latitude;
  const longitude = parsed.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function sanitizeExifItems(items: unknown): ExifRecord[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is ExifRecord => Boolean(item && typeof item === 'object'))
    .filter((item) => {
      const merged = `${item.type ?? ''} ${item.label ?? ''} ${item.description ?? ''} ${item.value ?? ''}`
        .trim()
        .toLowerCase();
      return merged.length > 0 && !NONE_MARKERS.some((marker) => merged.includes(marker));
    });
}

export async function extractExifItemsFromFile(file?: File | null): Promise<ExifRecord[]> {
  if (!file) return [];

  const parsed = (await exifr.parse(file, {
    gps: true,
    exif: true,
    tiff: true,
    // Model/Make/DateTimeOriginal 같은 표준 키를 그대로 받기 위해 키 변환 사용
    translateKeys: true,
    reviveValues: false,
  })) as ExifRecord | null;

  if (!parsed || typeof parsed !== 'object') return [];

  const items = [
    makeItem('gps', 'GPS 좌표', toGpsString(parsed), 'high'),
    makeItem('datetime_original', '촬영 시각', parsed.DateTimeOriginal ?? parsed.CreateDate),
    makeItem('device_model', '기기 모델', parsed.Model),
    makeItem('device_make', '제조사', parsed.Make),
    makeItem('software', '편집 소프트웨어', parsed.Software),
  ].filter((item): item is ExifRecord => Boolean(item));

  return items;
}
