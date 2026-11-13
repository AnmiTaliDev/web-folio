import { describe, expect, it } from 'vitest'
import { chooseMode } from './mode.ts'
import type { Profile, Rating } from '../shared/types.ts'

const profile: Profile = { interests: ['fantasy'], personalizationEnabled: true, aiDescriptionsEnabled: true, maxAge: null }

function ratings(likes: number, dislikes: number): Rating[] {
  return [
    ...Array.from({ length: likes }, (_, i): Rating => ({ bookId: `l${i}`, value: 1 })),
    ...Array.from({ length: dislikes }, (_, i): Rating => ({ bookId: `d${i}`, value: -1 })),
  ]
}

describe('chooseMode', () => {
  it('uses popular mode with no ratings', () => {
    expect(chooseMode(profile, [])).toBe('popular')
  })

  it('uses popular mode when personalization is disabled', () => {
    expect(chooseMode({ ...profile, personalizationEnabled: false }, ratings(10, 5))).toBe('popular')
  })

  it('uses popular mode when there are no likes', () => {
    expect(chooseMode(profile, ratings(0, 3))).toBe('popular')
  })

  it('uses profile mode below the threshold', () => {
    expect(chooseMode(profile, ratings(3, 2))).toBe('profile')
  })

  it('uses profile mode above the threshold when there are no dislikes', () => {
    expect(chooseMode(profile, ratings(12, 0))).toBe('profile')
  })

  it('uses mlp mode at the threshold with both likes and dislikes', () => {
    expect(chooseMode(profile, ratings(5, 3))).toBe('mlp')
  })
})
