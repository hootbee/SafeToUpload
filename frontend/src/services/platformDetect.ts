import type { Platform, SettingsState } from '../shared/types';

function safeParseUrl(raw?: string): URL | null {
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function detectPlatformFromUrl(raw?: string): Platform {
  const url = safeParseUrl(raw);
  const host = url?.hostname.toLowerCase() ?? '';

  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
  if (host.includes('facebook.com')) return 'facebook';
  return 'other';
}

export function applyPlatformAutoToggle(settings: SettingsState, platform: Platform): SettingsState {
  if (platform === 'other') return settings;
  if (settings.platforms[platform]) return settings;
  return {
    ...settings,
    platforms: {
      ...settings.platforms,
      [platform]: true,
    },
  };
}

