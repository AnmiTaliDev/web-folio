import type { ScoredBook } from '../recommend/pipeline.ts'
import { PICK_POOL } from './constants.ts'

function hash(text: string): number {
  let value = 2166136261
  for (const character of text) {
    value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0
  }
  return value
}

export function pickBookOfDay(ranked: ScoredBook[], excludedBookIds: Set<string>, seed: string): ScoredBook | null {
  const sorted = [...ranked].sort((a, b) => b.score - a.score || b.book.popularity - a.book.popularity)
  const eligible = sorted.filter((item) => !excludedBookIds.has(item.book.id))
  const pool = eligible.slice(0, PICK_POOL)
  return pool[hash(seed) % Math.max(pool.length, 1)] ?? sorted[0] ?? null
}
