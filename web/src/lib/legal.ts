export type LicenseId = 'agpl' | 'ccbysa' | 'ofl'

export const OFFICIAL_URLS: Record<LicenseId, string> = {
  agpl: 'https://www.gnu.org/licenses/agpl-3.0.html',
  ccbysa: 'https://creativecommons.org/licenses/by-sa/4.0/',
  ofl: 'https://openfontlicense.org/open-font-license-official-text/',
}

export const LICENSE_LOADERS: Record<LicenseId, () => Promise<string>> = {
  agpl: async () => (await import('../../../LICENSE?raw')).default,
  ccbysa: async () => (await import('../../../catalog/LICENSE?raw')).default,
  ofl: async () => {
    const texts = await Promise.all([
      import('../assets/fonts/OFL.txt?raw'),
      import('../assets/fonts/OFL-Roboto.txt?raw'),
      import('../assets/fonts/OFL-GoogleSans.txt?raw'),
      import('../assets/fonts/OFL-GoogleSansFlex.txt?raw'),
    ])
    const names = ['Roboto Flex', 'Roboto', 'Google Sans', 'Google Sans Flex']
    return texts.map((module, index) => `${names[index]}\n\n${module.default.trim()}`).join('\n\n----------\n\n')
  },
}

export function sourceUrl(env: Record<string, unknown> = import.meta.env): string | null {
  const raw = env.VITE_SOURCE_URL
  const value = typeof raw === 'string' ? raw.trim() : ''
  return /^https?:\/\//.test(value) ? value : null
}
