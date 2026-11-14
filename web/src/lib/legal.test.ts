import { describe, expect, it } from 'vitest'
import { LICENSE_LOADERS, OFFICIAL_URLS, sourceUrl, type LicenseId } from './legal.ts'

describe('license texts', () => {
  it('load the real license files', async () => {
    const [agpl, ccbysa, ofl] = await Promise.all((['agpl', 'ccbysa', 'ofl'] as LicenseId[]).map((id) => LICENSE_LOADERS[id]()))
    expect(agpl).toContain('GNU AFFERO GENERAL PUBLIC LICENSE')
    expect(agpl).toContain('Version 3, 19 November 2007')
    expect(ccbysa).toContain('Attribution-ShareAlike 4.0 International')
    expect(ofl).toContain('SIL OPEN FONT LICENSE Version 1.1')
    for (const name of ['Roboto Flex', 'Roboto', 'Google Sans', 'Google Sans Flex']) {
      expect(ofl).toContain(name)
    }
  })

  it('point to https pages', () => {
    for (const url of Object.values(OFFICIAL_URLS)) {
      expect(url.startsWith('https://')).toBe(true)
    }
  })
})

describe('sourceUrl', () => {
  it('accepts only http(s) addresses', () => {
    expect(sourceUrl({ VITE_SOURCE_URL: 'https://example.org/folio' })).toBe('https://example.org/folio')
    expect(sourceUrl({ VITE_SOURCE_URL: 'javascript:alert(1)' })).toBeNull()
    expect(sourceUrl({})).toBeNull()
  })
})
