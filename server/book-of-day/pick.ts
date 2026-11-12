import type { ScoredBook } from '../recommend/pipeline.ts'

export function pickBookOfDay(ranked: ScoredBook[], recentBookIds: Set<string>): ScoredBook | null {
  const sorted = [...ranked].sort((a, b) => b.score - a.score || b.book.popularity - a.book.popularity)
  return sorted.find((item) => !recentBookIds.has(item.book.id)) ?? sorted[0] ?? null
}
