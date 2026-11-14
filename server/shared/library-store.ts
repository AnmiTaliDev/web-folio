import type { Db } from '../db/database.ts'
import { loadBooks } from './books-store.ts'
import type { AgeLimit, Book } from './types.ts'
import { parseStringList } from './json-column.ts'

export type TasteStats = { readCount: number; likedCount: number; topGenres: string[] }

export function bookExists(db: Db, bookId: string): boolean {
  return db.prepare('select 1 from books where id = ?').get(bookId) !== undefined
}

export function ratingMap(db: Db, userId: string): Record<string, number> {
  const rows = db.prepare('select book_id, value from ratings where user_id = ?').all(userId) as { book_id: string; value: number }[]
  return Object.fromEntries(rows.map((row) => [row.book_id, row.value]))
}

export function setRating(db: Db, userId: string, bookId: string, value: 1 | -1, isRead: boolean, now: Date): void {
  db.prepare(
    `insert into ratings (user_id, book_id, value, is_read, created_at) values (?, ?, ?, ?, ?)
     on conflict (user_id, book_id) do update set value = excluded.value, is_read = excluded.is_read`,
  ).run(userId, bookId, value, isRead ? 1 : 0, now.toISOString())
}

export function removeRating(db: Db, userId: string, bookId: string): void {
  db.prepare('delete from ratings where user_id = ? and book_id = ?').run(userId, bookId)
}

export function wishlistIds(db: Db, userId: string): string[] {
  const rows = db.prepare('select book_id from wishlist where user_id = ? order by created_at').all(userId) as { book_id: string }[]
  return rows.map((row) => row.book_id)
}

export function wishlistBooks(db: Db, userId: string): Book[] {
  return loadBooks(db, wishlistIds(db, userId))
}

export function addToWishlist(db: Db, userId: string, bookId: string, now: Date): void {
  db.prepare('delete from book_status where user_id = ? and book_id = ?').run(userId, bookId)
  db.prepare('insert into wishlist (user_id, book_id, created_at) values (?, ?, ?) on conflict do nothing').run(userId, bookId, now.toISOString())
}

export function removeFromWishlist(db: Db, userId: string, bookId: string): void {
  db.prepare('delete from wishlist where user_id = ? and book_id = ?').run(userId, bookId)
}

export function saveProfile(db: Db, userId: string, interests: string[], consent: boolean, now: Date): void {
  db.prepare(
    `insert into profiles (user_id, interests, consent_at) values (?, ?, ?)
     on conflict (user_id) do update set interests = excluded.interests,
       consent_at = coalesce(excluded.consent_at, profiles.consent_at)`,
  ).run(userId, JSON.stringify(interests), consent ? now.toISOString() : null)
}

export function updateProfileFlags(
  db: Db,
  userId: string,
  flags: { personalizationEnabled?: boolean; aiDescriptionsEnabled?: boolean; maxAge?: AgeLimit },
): boolean {
  const result = db
    .prepare(
      `update profiles set
         personalization_enabled = coalesce(?, personalization_enabled),
         ai_descriptions_enabled = coalesce(?, ai_descriptions_enabled),
         max_age = case when ? = 1 then ? else max_age end
       where user_id = ?`,
    )
    .run(
      flags.personalizationEnabled === undefined ? null : flags.personalizationEnabled ? 1 : 0,
      flags.aiDescriptionsEnabled === undefined ? null : flags.aiDescriptionsEnabled ? 1 : 0,
      flags.maxAge === undefined ? 0 : 1,
      flags.maxAge ?? null,
      userId,
    )
  return Number(result.changes) > 0
}

export function tasteStats(db: Db, userId: string): TasteStats {
  const rows = db
    .prepare('select ratings.value as value, ratings.is_read as is_read, books.genres as genres from ratings join books on books.id = ratings.book_id where ratings.user_id = ?')
    .all(userId) as { value: number; is_read: number; genres: string }[]
  let readCount = 0
  let likedCount = 0
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (row.is_read === 1) {
      readCount++
    }
    if (row.value === 1) {
      likedCount++
      for (const genre of parseStringList(row.genres)) {
        counts.set(genre, (counts.get(genre) ?? 0) + 1)
      }
    }
  }
  const topGenres = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre)
  return { readCount, likedCount, topGenres }
}

export const SHELF_STATUSES = ['want', 'reading', 'read'] as const
export type ShelfStatus = (typeof SHELF_STATUSES)[number]
export type ShelfItem = { book: Book; status: ShelfStatus; updatedAt: string }

export function shelfItems(db: Db, userId: string): ShelfItem[] {
  const wanted = db.prepare('select book_id, created_at from wishlist where user_id = ?').all(userId) as { book_id: string; created_at: string }[]
  const tracked = db.prepare('select book_id, status, updated_at from book_status where user_id = ?').all(userId) as {
    book_id: string
    status: 'reading' | 'read'
    updated_at: string
  }[]
  const entries = [
    ...wanted.map((row) => ({ bookId: row.book_id, status: 'want' as ShelfStatus, updatedAt: row.created_at })),
    ...tracked.map((row) => ({ bookId: row.book_id, status: row.status as ShelfStatus, updatedAt: row.updated_at })),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const books = new Map(loadBooks(db, entries.map((entry) => entry.bookId)).map((book) => [book.id, book]))
  return entries.flatMap((entry) => {
    const book = books.get(entry.bookId)
    return book ? [{ book, status: entry.status, updatedAt: entry.updatedAt }] : []
  })
}

export function setShelfStatus(db: Db, userId: string, bookId: string, status: ShelfStatus, now: Date): void {
  if (status === 'want') {
    addToWishlist(db, userId, bookId, now)
    return
  }
  db.prepare('delete from wishlist where user_id = ? and book_id = ?').run(userId, bookId)
  db.prepare(
    `insert into book_status (user_id, book_id, status, updated_at) values (?, ?, ?, ?)
     on conflict (user_id, book_id) do update set status = excluded.status, updated_at = excluded.updated_at`,
  ).run(userId, bookId, status, now.toISOString())
}

export function clearShelfStatus(db: Db, userId: string, bookId: string): void {
  db.prepare('delete from wishlist where user_id = ? and book_id = ?').run(userId, bookId)
  db.prepare('delete from book_status where user_id = ? and book_id = ?').run(userId, bookId)
}

export type RatedItem = { book: Book; value: 1 | -1; isRead: boolean; createdAt: string }

export function ratedItems(db: Db, userId: string): RatedItem[] {
  const rows = db
    .prepare('select book_id, value, is_read, created_at from ratings where user_id = ? order by created_at desc, rowid desc')
    .all(userId) as { book_id: string; value: number; is_read: number; created_at: string }[]
  const books = new Map(loadBooks(db, rows.map((row) => row.book_id)).map((book) => [book.id, book]))
  return rows.flatMap((row) => {
    const book = books.get(row.book_id)
    return book ? [{ book, value: row.value as 1 | -1, isRead: row.is_read === 1, createdAt: row.created_at }] : []
  })
}
