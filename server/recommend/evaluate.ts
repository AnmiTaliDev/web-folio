import type { Book } from '../shared/types.ts'
import { cosine, profileVector } from './math.ts'
import { ndcgAtK, precisionAtK } from './metrics.ts'
import { scoreCandidates } from './pipeline.ts'
import { similarReaderShares } from './readers.ts'

export type EvalRating = { userId: string; isbn: string; value: 1 | -1 }

export type EvalUser = { userId: string; ratings: { bookId: string; value: 1 | -1 }[] }

export type MethodName = 'popularity' | 'cosine' | 'mlp'

export type MethodResult = { precision: Record<number, number>; ndcg: Record<number, number> }

export type EvaluationResult = { users: number; methods: Record<MethodName, MethodResult> }

export const EVAL_KS = [5, 15]
const HIDDEN_SHARE = 0.3
const TOP_GENRES = 3

export function parseRatingsCsv(text: string): EvalRating[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const header = (lines[0] ?? '').split(',').map((cell) => cell.trim())
  const userIndex = header.indexOf('user_id')
  const isbnIndex = header.indexOf('isbn')
  const valueIndex = header.indexOf('value')
  if (userIndex < 0 || isbnIndex < 0 || valueIndex < 0) {
    throw new Error('CSV header must contain user_id, isbn and value')
  }
  return lines.slice(1).flatMap((line) => {
    const cells = line.split(',').map((cell) => cell.trim())
    const value = Number(cells[valueIndex])
    const userId = cells[userIndex]
    const isbn = cells[isbnIndex]
    if (!userId || !isbn || (value !== 1 && value !== -1)) {
      return []
    }
    return [{ userId, isbn: isbn.replace(/[^0-9]/g, ''), value } as EvalRating]
  })
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function splitLikes(likes: string[], seed: number): { visible: string[]; hidden: string[] } {
  const random = seededRandom(seed)
  const shuffled = [...likes].sort(() => random() - 0.5)
  const hiddenCount = Math.max(1, Math.round(likes.length * HIDDEN_SHARE))
  return { hidden: shuffled.slice(0, hiddenCount), visible: shuffled.slice(hiddenCount) }
}

function topGenres(books: Book[]): string[] {
  const counts = new Map<string, number>()
  for (const book of books) {
    for (const genre of book.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_GENRES)
    .map(([genre]) => genre)
}

function accumulate(sums: MethodResult, ranked: string[], hidden: Set<string>): void {
  for (const k of EVAL_KS) {
    sums.precision[k] = (sums.precision[k] ?? 0) + precisionAtK(ranked, hidden, k)
    sums.ndcg[k] = (sums.ndcg[k] ?? 0) + ndcgAtK(ranked, hidden, k)
  }
}

function emptyResult(): MethodResult {
  return { precision: {}, ndcg: {} }
}

function average(result: MethodResult, count: number): MethodResult {
  const mean = (values: Record<number, number>): Record<number, number> =>
    Object.fromEntries(EVAL_KS.map((k) => [k, count === 0 ? 0 : (values[k] ?? 0) / count]))
  return { precision: mean(result.precision), ndcg: mean(result.ndcg) }
}

export async function evaluateUsers(users: EvalUser[], books: Book[], seed: number): Promise<EvaluationResult> {
  const byId = new Map(books.map((book) => [book.id, book]))
  const dim = books.find((book) => book.embedding)?.embedding?.length ?? 0

  const prepared = users.flatMap((user) => {
    const likes = user.ratings.filter((rating) => rating.value === 1 && byId.has(rating.bookId)).map((rating) => rating.bookId)
    const dislikes = user.ratings.filter((rating) => rating.value === -1 && byId.has(rating.bookId)).map((rating) => rating.bookId)
    if (likes.length < 2 || dislikes.length < 1) {
      return []
    }
    const { visible, hidden } = splitLikes(likes, seed)
    return [{ userId: user.userId, visibleLikes: visible, dislikes, hidden: new Set(hidden) }]
  })

  const likesByUser = new Map(prepared.map((user) => [user.userId, new Set(user.visibleLikes)]))
  const sums: Record<MethodName, MethodResult> = { popularity: emptyResult(), cosine: emptyResult(), mlp: emptyResult() }

  for (const user of prepared) {
    const seen = new Set([...user.visibleLikes, ...user.dislikes])
    const pool = books.filter((book) => !seen.has(book.id))
    const liked = user.visibleLikes.flatMap((id) => byId.get(id) ?? [])
    const disliked = user.dislikes.flatMap((id) => byId.get(id) ?? [])
    const others = new Map([...likesByUser].filter(([id]) => id !== user.userId))
    const readers = similarReaderShares(
      new Set(user.visibleLikes),
      others,
      pool.map((book) => book.id),
    )

    const popularityRanking = [...pool].sort((a, b) => b.popularity - a.popularity).map((book) => book.id)

    const vector = profileVector(
      liked.flatMap((book) => (book.embedding ? [book.embedding] : [])),
      disliked.flatMap((book) => (book.embedding ? [book.embedding] : [])),
      dim,
    )
    const cosineRanking = [...pool]
      .sort((a, b) => cosine(vector, b.embedding ?? []) - cosine(vector, a.embedding ?? []))
      .map((book) => book.id)

    const scored = await scoreCandidates({
      mode: 'mlp',
      profile: { interests: topGenres(liked), personalizationEnabled: true, aiDescriptionsEnabled: true },
      liked,
      disliked,
      candidates: pool,
      readers,
      dim,
    })
    const mlpRanking = scored.sort((a, b) => b.score - a.score).map((item) => item.book.id)

    accumulate(sums.popularity, popularityRanking, user.hidden)
    accumulate(sums.cosine, cosineRanking, user.hidden)
    accumulate(sums.mlp, mlpRanking, user.hidden)
  }

  return {
    users: prepared.length,
    methods: {
      popularity: average(sums.popularity, prepared.length),
      cosine: average(sums.cosine, prepared.length),
      mlp: average(sums.mlp, prepared.length),
    },
  }
}
