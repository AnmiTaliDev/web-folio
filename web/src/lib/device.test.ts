import { describe, expect, it } from 'vitest'
import { describeDevice, deviceLabel, formatDate } from './device.ts'

describe('describeDevice', () => {
  it('recognizes common desktop browsers', () => {
    expect(describeDevice('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36')).toEqual({ browser: 'Chrome', os: 'Linux', kind: 'desktop' })
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0')).toMatchObject({ browser: 'Edge', os: 'Windows' })
    expect(describeDevice('Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0')).toMatchObject({ browser: 'Firefox', os: 'Linux' })
    expect(describeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15')).toMatchObject({ browser: 'Safari', os: 'macOS' })
  })

  it('recognizes phones and tablets', () => {
    expect(describeDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36')).toEqual({ browser: 'Chrome', os: 'Android', kind: 'phone' })
    expect(describeDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toMatchObject({ os: 'iOS', kind: 'tablet' })
    expect(describeDevice('Mozilla/5.0 (Linux; Android 14; SM-X900) AppleWebKit/537.36 Chrome/126.0 Safari/537.36')).toMatchObject({ kind: 'tablet' })
  })

  it('handles empty and unknown agents', () => {
    expect(describeDevice('')).toEqual({ browser: '', os: '', kind: 'unknown' })
    expect(deviceLabel(describeDevice(''), 'Unknown device')).toBe('Unknown device')
    expect(deviceLabel(describeDevice('curl/8.0'), 'x')).toBe('curl')
  })
})

describe('formatDate', () => {
  it('formats in the interface language and passes invalid values through', () => {
    expect(formatDate('2026-11-13T10:00:00.000Z', 'en')).toContain('2026')
    expect(formatDate('2026-11-13T10:00:00.000Z', 'ru')).toMatch(/ноября/)
    expect(formatDate('garbage', 'en')).toBe('garbage')
  })
})
