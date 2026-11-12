import type { ScoredBook } from './pipeline.ts'
import type { Reason } from '../shared/types.ts'

export function splitPercents(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total <= 0) {
    return values.map(() => 0)
  }
  const exact = values.map((value) => (value / total) * 100)
  const floors = exact.map((value) => Math.floor(value))
  let remaining = 100 - floors.reduce((sum, value) => sum + value, 0)
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (const entry of order) {
    if (remaining <= 0) {
      break
    }
    floors[entry.index] = (floors[entry.index] ?? 0) + 1
    remaining--
  }
  return floors
}

export function buildReasons(scored: ScoredBook): Reason[] {
  const drafts: Omit<Reason, 'percent'>[] = []
  const amounts: number[] = []

  if (scored.contributions.signal > 0) {
    if (scored.mode !== 'popular' && scored.likedMatch) {
      drafts.push({
        type: 'liked_book',
        label: `Similar to ${scored.likedMatch.title}`,
        bookId: scored.likedMatch.bookId,
        title: scored.likedMatch.title,
      })
    } else {
      drafts.push({ type: 'popular', label: 'Popular among readers' })
    }
    amounts.push(scored.contributions.signal)
  }
  if (scored.contributions.genre > 0) {
    const genres = scored.book.genres.filter((genre) => scored.interests.includes(genre))
    drafts.push({ type: 'genre', label: `Matches your interests: ${genres.join(', ')}`, genres })
    amounts.push(scored.contributions.genre)
  }
  if (scored.contributions.readers > 0) {
    drafts.push({ type: 'similar_readers', label: 'Liked by readers with similar taste' })
    amounts.push(scored.contributions.readers)
  }

  const percents = splitPercents(amounts)
  return drafts.map((draft, index) => ({ ...draft, percent: percents[index] ?? 0 }))
}
