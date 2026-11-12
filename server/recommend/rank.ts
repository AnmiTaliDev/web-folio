import { MAX_BOOKS_PER_AUTHOR, TOP_N } from './constants.ts'

export type Rankable = { book: { authors: string[]; popularity: number }; score: number }

export function selectTop<T extends Rankable>(items: T[], limit: number = TOP_N, maxPerAuthor: number = MAX_BOOKS_PER_AUTHOR): T[] {
  const sorted = [...items].sort((a, b) => b.score - a.score || b.book.popularity - a.book.popularity)
  const perAuthor = new Map<string, number>()
  const result: T[] = []
  for (const item of sorted) {
    const author = item.book.authors[0] ?? ''
    const used = perAuthor.get(author) ?? 0
    if (author !== '' && used >= maxPerAuthor) {
      continue
    }
    perAuthor.set(author, used + 1)
    result.push(item)
    if (result.length === limit) {
      break
    }
  }
  return result
}
