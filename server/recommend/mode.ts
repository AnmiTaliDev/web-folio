import { COLD_START_MIN_RATINGS } from './constants.ts'
import type { Profile, Rating } from '../shared/types.ts'

export type Mode = 'popular' | 'profile' | 'mlp'

export function chooseMode(profile: Profile, ratings: Rating[]): Mode {
  if (!profile.personalizationEnabled) {
    return 'popular'
  }
  const likes = ratings.filter((rating) => rating.value === 1).length
  const dislikes = ratings.length - likes
  if (likes === 0) {
    return 'popular'
  }
  if (ratings.length >= COLD_START_MIN_RATINGS && dislikes > 0) {
    return 'mlp'
  }
  return 'profile'
}
