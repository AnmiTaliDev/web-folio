import { WEIGHTS } from './constants.ts'

export type Components = { signal: number; genre: number; readers: number }
export type ActiveComponents = { signal: boolean; genre: boolean; readers: boolean }

export function genreMatch(bookGenres: string[], interests: string[]): number {
  if (interests.length === 0 || bookGenres.length === 0) {
    return 0
  }
  const overlap = bookGenres.filter((genre) => interests.includes(genre)).length
  return overlap / Math.min(interests.length, bookGenres.length)
}

export function popularityValue(popularity: number, maxPopularity: number): number {
  if (maxPopularity <= 0) {
    return 0
  }
  return Math.log1p(popularity) / Math.log1p(maxPopularity)
}

export function contributions(components: Components, active: ActiveComponents): Components {
  return {
    signal: active.signal ? WEIGHTS.signal * components.signal : 0,
    genre: active.genre ? WEIGHTS.genre * components.genre : 0,
    readers: active.readers ? WEIGHTS.readers * components.readers : 0,
  }
}

export function totalScore(parts: Components, active: ActiveComponents): number {
  const weightSum =
    (active.signal ? WEIGHTS.signal : 0) + (active.genre ? WEIGHTS.genre : 0) + (active.readers ? WEIGHTS.readers : 0)
  if (weightSum === 0) {
    return 0
  }
  return (parts.signal + parts.genre + parts.readers) / weightSum
}
