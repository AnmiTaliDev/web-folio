import { afterEach, describe, expect, it, vi } from 'vitest'
import { ageLimit, parseAge, setAgeLimit } from './age.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('age limit', () => {
  it('parses only the known levels', () => {
    expect(parseAge('12')).toBe(12)
    expect(parseAge('18')).toBe(18)
    expect(parseAge('10')).toBeNull()
    expect(parseAge('abc')).toBeNull()
    expect(parseAge(null)).toBeNull()
  })

  it('is stored on the device for a visitor without an account', async () => {
    expect(ageLimit()).toBeNull()
    await setAgeLimit(16)
    expect(ageLimit()).toBe(16)
    expect(window.localStorage.getItem('folio.maxAge')).toBe('16')
    await setAgeLimit(null)
    expect(ageLimit()).toBeNull()
    expect(window.localStorage.getItem('folio.maxAge')).toBeNull()
  })

  it('sends the limit as a header with requests', async () => {
    const fetchMock = vi.fn(async () => new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await import('../api/client.ts')
    await setAgeLimit(12)
    await api.popular()
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['X-Max-Age']).toBe('12')
    await setAgeLimit(null)
    await api.popular()
    const [, second] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect((second.headers as Record<string, string>)['X-Max-Age']).toBeUndefined()
  })
})
