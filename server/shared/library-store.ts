import type { Db } from '../db/database.ts'
import { loadBooks } from './books-store.ts'
import type { AgeLimit, Book } from './types.ts'
import { parseStringList } from './json-column.ts'

export type TasteStats = { readCount: number; likedCount: number; topGenres: string[] }

export async function bookExists(db: Db, bookId: string): Promise<boolean> {
  return (await db.get('select 1 as found from books where id = ?', bookId)) !== undefined
}

export async function ratingMap(db: Db, userId: string): Promise<Record<string, number>> {
  const rows = await db.all<{ book_id: string; value: number }>('select book_id, value from ratings where user_id = ?', userId)
  return Object.fromEntries(rows.map((row) => [row.book_id, row.value]))
}

export async function setRating(db: Db, userId: string, bookId: string, value: 1 | -1, isRead: boolean, now: Date): Promise<void> {
  await db.run(
    `insert into ratings (user_id, book_id, value, is_read, created_at) values (?, ?, ?, ?, ?)
     on conflict (user_id, book_id) do update set value = excluded.value, is_read = excluded.is_read`,
    userId,
    bookId,
    value,
    isRead ? 1 : 0,
    now.toISOString(),
  )
}

export async function removeRating(db: Db, userId: string, bookId: string): Promise<void> {
  await db.run('delete from ratings where user_id = ? and book_id = ?', userId, bookId)
}

export async function wishlistIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db.all<{ book_id: string }>('select book_id from wishlist where user_id = ? order by created_at', userId)
  return rows.map((row) => row.book_id)
}

export async function wishlistBooks(db: Db, userId: string): Promise<Book[]> {
  return await loadBooks(db, await wishlistIds(db, userId))
}

export async function addToWishlist(db: Db, userId: string, bookId: string, now: Date): Promise<void> {
  await db.run('delete from book_status where user_id = ? and book_id = ?', userId, bookId)
  await db.run('insert into wishlist (user_id, book_id, created_at) values (?, ?, ?) on conflict do nothing', userId, bookId, now.toISOString())
}

export async function removeFromWishlist(db: Db, userId: string, bookId: string): Promise<void> {
  await db.run('delete from wishlist where user_id = ? and book_id = ?', userId, bookId)
}

export async function saveProfile(db: Db, userId: string, interests: string[], consent: boolean, now: Date): Promise<void> {
  await db.run(
    `insert into profiles (user_id, interests, consent_at) values (?, ?, ?)
     on conflict (user_id) do update set interests = excluded.interests,
       consent_at = coalesce(excluded.consent_at, profiles.consent_at)`,
    userId,
    JSON.stringify(interests),
    consent ? now.toISOString() : null,
  )
}

export async function updateProfileFlags(
  db: Db,
  userId: string,
  flags: { personalizationEnabled?: boolean; aiDescriptionsEnabled?: boolean; maxAge?: AgeLimit },
): Promise<boolean> {
  const result = await db.run(
    `update profiles set
       personalization_enabled = coalesce(cast(? as integer), personalization_enabled),
       ai_descriptions_enabled = coalesce(cast(? as integer), ai_descriptions_enabled),
       max_age = case when cast(? as integer) = 1 then cast(? as integer) else max_age end
     where user_id = ?`,
    flags.personalizationEnabled === undefined ? null : flags.personalizationEnabled ? 1 : 0,
    flags.aiDescriptionsEnabled === undefined ? null : flags.aiDescriptionsEnabled ? 1 : 0,
    flags.maxAge === undefined ? 0 : 1,
    flags.maxAge ?? null,
    userId,
  )
  return result.changes > 0
}

export async function tasteStats(db: Db, userId: string): Promise<TasteStats> {
  const rows = await db.all<{ book_id: string; value: number; is_read: number; genres: string }>(
    'select ratings.book_id as book_id, ratings.value as value, ratings.is_read as is_read, books.genres as genres from ratings join books on books.id = ratings.book_id where ratings.user_id = ?',
    userId,
  )
  const shelfRead = await db.all<{ book_id: string }>("select book_id from book_status where user_id = ? and status = 'read'", userId)
  const read = new Set(shelfRead.map((row) => row.book_id))
  let likedCount = 0
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (row.is_read === 1) {
      read.add(row.book_id)
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
  return { readCount: read.size, likedCount, topGenres }
}

export const SHELF_STATUSES = ['want', 'reading', 'read'] as const
export type ShelfStatus = (typeof SHELF_STATUSES)[number]
export type ShelfItem = { book: Book; status: ShelfStatus; updatedAt: string }

export async function shelfItems(db: Db, userId: string): Promise<ShelfItem[]> {
  const wanted = await db.all<{ book_id: string; created_at: string }>('select book_id, created_at from wishlist where user_id = ?', userId)
  const tracked = await db.all<{ book_id: string; status: 'reading' | 'read'; updated_at: string }>(
    'select book_id, status, updated_at from book_status where user_id = ?',
    userId,
  )
  const entries = [
    ...wanted.map((row) => ({ bookId: row.book_id, status: 'want' as ShelfStatus, updatedAt: row.created_at })),
    ...tracked.map((row) => ({ bookId: row.book_id, status: row.status as ShelfStatus, updatedAt: row.updated_at })),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const books = new Map((await loadBooks(db, entries.map((entry) => entry.bookId))).map((book) => [book.id, book]))
  return entries.flatMap((entry) => {
    const book = books.get(entry.bookId)
    return book ? [{ book, status: entry.status, updatedAt: entry.updatedAt }] : []
  })
}

export async function setShelfStatus(db: Db, userId: string, bookId: string, status: ShelfStatus, now: Date): Promise<void> {
  if (status === 'want') {
    await addToWishlist(db, userId, bookId, now)
    return
  }
  await db.run('delete from wishlist where user_id = ? and book_id = ?', userId, bookId)
  await db.run(
    `insert into book_status (user_id, book_id, status, updated_at) values (?, ?, ?, ?)
     on conflict (user_id, book_id) do update set status = excluded.status, updated_at = excluded.updated_at`,
    userId,
    bookId,
    status,
    now.toISOString(),
  )
}

export async function clearShelfStatus(db: Db, userId: string, bookId: string): Promise<void> {
  await db.run('delete from wishlist where user_id = ? and book_id = ?', userId, bookId)
  await db.run('delete from book_status where user_id = ? and book_id = ?', userId, bookId)
}

export type RatedItem = { book: Book; value: 1 | -1; isRead: boolean; createdAt: string }

export async function ratedItems(db: Db, userId: string): Promise<RatedItem[]> {
  const rows = await db.all<{ book_id: string; value: number; is_read: number; created_at: string }>(
    'select book_id, value, is_read, created_at from ratings where user_id = ? order by created_at desc, book_id desc',
    userId,
  )
  const books = new Map((await loadBooks(db, rows.map((row) => row.book_id))).map((book) => [book.id, book]))
  return rows.flatMap((row) => {
    const book = books.get(row.book_id)
    return book ? [{ book, value: row.value as 1 | -1, isRead: row.is_read === 1, createdAt: row.created_at }] : []
  })
}
