import type { Db } from '../db/database.ts'
import { blockedBookIds, loadBooks, matchBooks, popularBooks } from '../shared/books-store.ts'
import { loadLikesOfSimilarUsers, loadProfile, loadRatings } from '../shared/user-store.ts'
import type { Book, Profile } from '../shared/types.ts'
import { CANDIDATE_COUNT, SIMILAR_READERS_MAX_USERS } from './constants.ts'
import { profileVector } from './math.ts'
import { chooseMode } from './mode.ts'
import { scoreCandidates, type ScoredBook } from './pipeline.ts'
import { selectTop } from './rank.ts'
import { similarReaderShares } from './readers.ts'

async function buildScored(db: Db, userId: string, extraBookId: string | null): Promise<{ scored: ScoredBook[]; profile: Profile }> {
  const profile = await loadProfile(db, userId)
  const ratings = await loadRatings(db, userId)
  const ratedBooks = await loadBooks(
    db,
    ratings.map((rating) => rating.bookId),
  )
  const valueById = new Map(ratings.map((rating) => [rating.bookId, rating.value]))
  const liked = ratedBooks.filter((book) => valueById.get(book.id) === 1)
  const disliked = ratedBooks.filter((book) => valueById.get(book.id) === -1)
  const likedEmbeddings = liked.flatMap((book) => (book.embedding ? [book.embedding] : []))
  const chosen = chooseMode(profile, ratings)
  const mode = chosen !== 'popular' && likedEmbeddings.length === 0 ? 'popular' : chosen
  const excludeIds = [...ratings.map((rating) => rating.bookId), ...(await blockedBookIds(db, profile.maxAge))].filter((id) => id !== extraBookId)

  const dim = likedEmbeddings[0]?.length ?? 0

  let candidates: Book[]
  if (mode === 'popular') {
    candidates = await popularBooks(db, profile.interests, CANDIDATE_COUNT, excludeIds, profile.maxAge)
  } else {
    const vector = profileVector(
      likedEmbeddings,
      disliked.flatMap((book) => (book.embedding ? [book.embedding] : [])),
      dim,
    )
    candidates = await matchBooks(db, vector, CANDIDATE_COUNT, excludeIds, null)
  }

  if (extraBookId && !candidates.some((book) => book.id === extraBookId)) {
    candidates = [...candidates, ...(await loadBooks(db, [extraBookId]))]
  }

  let readers = new Map<string, number>()
  if (mode !== 'popular') {
    const others = await loadLikesOfSimilarUsers(
      db,
      userId,
      liked.map((book) => book.id),
      SIMILAR_READERS_MAX_USERS,
    )
    readers = similarReaderShares(
      new Set(liked.map((book) => book.id)),
      others,
      candidates.map((book) => book.id),
    )
  }

  const scored = await scoreCandidates({ mode, profile, liked, disliked, candidates, readers, dim })
  return { scored, profile }
}

export async function recommendForUser(db: Db, userId: string): Promise<ScoredBook[]> {
  const { scored } = await buildScored(db, userId, null)
  return selectTop(scored)
}

export async function rankedForUser(db: Db, userId: string): Promise<ScoredBook[]> {
  const { scored } = await buildScored(db, userId, null)
  return scored
}

export async function scoreOneBook(db: Db, userId: string, bookId: string): Promise<{ scored: ScoredBook | null; profile: Profile }> {
  const { scored, profile } = await buildScored(db, userId, bookId)
  return { scored: scored.find((item) => item.book.id === bookId) ?? null, profile }
}
