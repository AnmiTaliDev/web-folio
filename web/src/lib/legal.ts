export type LicenseId = 'agpl' | 'ccbysa' | 'ofl'

export const OFFICIAL_URLS: Record<LicenseId, string> = {
  agpl: 'https://www.gnu.org/licenses/agpl-3.0.html',
  ccbysa: 'https://creativecommons.org/licenses/by-sa/4.0/',
  ofl: 'https://openfontlicense.org/open-font-license-official-text/',
}

export const LICENSE_LOADERS: Record<LicenseId, () => Promise<string>> = {
  agpl: async () => (await import('../../../LICENSE?raw')).default,
  ccbysa: async () => (await import('../../../catalog/LICENSE?raw')).default,
  ofl: async () => (await import('../assets/fonts/OFL.txt?raw')).default,
}

export function sourceUrl(env: Record<string, unknown> = import.meta.env): string | null {
  const raw = env.VITE_SOURCE_URL
  const value = typeof raw === 'string' ? raw.trim() : ''
  return /^https?:\/\//.test(value) ? value : null
}
