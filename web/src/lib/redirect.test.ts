import { describe, expect, it } from 'vitest'
import { redirectFor, safeFrom, today } from './redirect.ts'

const guest = { registered: false, hasProfile: undefined }
const fresh = { registered: true, hasProfile: false }
const member = { registered: true, hasProfile: true }

describe('redirectFor', () => {
  it('lets guests use the public pages', () => {
    for (const path of ['/', '/chat', '/profile', '/settings', '/book/1', '/auth']) {
      expect(redirectFor(path, guest)).toBeNull()
    }
  })

  it('sends guests away from onboarding', () => {
    expect(redirectFor('/onboarding', guest)).toBe('/')
  })

  it('sends registered users without a profile to onboarding but never away from auth', () => {
    expect(redirectFor('/', fresh)).toBe('/onboarding')
    expect(redirectFor('/chat', fresh)).toBe('/onboarding')
    expect(redirectFor('/onboarding', fresh)).toBeNull()
    expect(redirectFor('/auth', fresh)).toBeNull()
    expect(redirectFor('/terms', fresh)).toBeNull()
  })

  it('waits while the profile is loading', () => {
    expect(redirectFor('/', { registered: true, hasProfile: undefined })).toBeNull()
  })

  it('moves members out of onboarding, honoring a safe from path', () => {
    expect(redirectFor('/onboarding', member)).toBe('/')
    expect(redirectFor('/onboarding', member, '/book/7')).toBe('/book/7')
    expect(redirectFor('/onboarding', member, '//evil.example')).toBe('/')
    expect(redirectFor('/', member)).toBeNull()
  })
})

describe('helpers', () => {
  it('accepts only same-origin paths', () => {
    expect(safeFrom('/chat')).toBe('/chat')
    expect(safeFrom('https://x.test')).toBeNull()
    expect(safeFrom('/\\x')).toBeNull()
    expect(safeFrom(null)).toBeNull()
  })

  it('formats the local day', () => {
    expect(today(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
