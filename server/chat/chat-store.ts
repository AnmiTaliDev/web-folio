import { randomUUID } from 'node:crypto'
import type { Db } from '../db/database.ts'
import { loadBooks } from '../shared/books-store.ts'
import { loadProfile, loadRatings } from '../shared/user-store.ts'
import { MAX_DISLIKED_TITLES, MAX_LIKED_TITLES } from './constants.ts'
import type { ChatProfile } from './chat.ts'
import { parseStringList } from '../shared/json-column.ts'

export function countRecentUserMessages(db: Db, userId: string, now: Date): number {
  const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const row = db
    .prepare("select count(*) as c from chat_messages where user_id = ? and role = 'user' and created_at >= ?")
    .get(userId, since) as { c: number }
  return row.c
}

export function saveExchange(db: Db, userId: string, userMessage: string, answer: string, bookIds: string[], now: Date): void {
  const insert = db.prepare('insert into chat_messages (id, user_id, role, content, book_ids, created_at) values (?, ?, ?, ?, ?, ?)')
  insert.run(randomUUID(), userId, 'user', userMessage, '[]', now.toISOString())
  insert.run(randomUUID(), userId, 'assistant', answer, JSON.stringify(bookIds), new Date(now.getTime() + 1).toISOString())
}

export function loadChatProfile(db: Db, userId: string): { profile: ChatProfile; ratedIds: string[] } {
  const profile = loadProfile(db, userId)
  const ratings = loadRatings(db, userId)
  const ratedIds = ratings.map((rating) => rating.bookId)
  if (!profile.personalizationEnabled) {
    return { profile: { interests: profile.interests, likedTitles: [], dislikedTitles: [] }, ratedIds }
  }
  const books = loadBooks(db, ratedIds)
  const titleById = new Map(books.map((book) => [book.id, book.title]))
  const titles = (value: 1 | -1, limit: number): string[] =>
    ratings
      .filter((rating) => rating.value === value)
      .flatMap((rating) => titleById.get(rating.bookId) ?? [])
      .slice(0, limit)
  return {
    profile: {
      interests: profile.interests,
      likedTitles: titles(1, MAX_LIKED_TITLES),
      dislikedTitles: titles(-1, MAX_DISLIKED_TITLES),
    },
    ratedIds,
  }
}

export type StoredMessage = { id: string; role: 'user' | 'assistant'; text: string; bookIds: string[]; createdAt: string }

export function loadChatHistory(db: Db, userId: string, limit: number): StoredMessage[] {
  const rows = db
    .prepare('select id, role, content, book_ids, created_at from chat_messages where user_id = ? order by created_at desc, rowid desc limit ?')
    .all(userId, limit) as { id: string; role: 'user' | 'assistant'; content: string; book_ids: string; created_at: string }[]
  return rows
    .reverse()
    .map((row) => ({ id: row.id, role: row.role, text: row.content, bookIds: parseStringList(row.book_ids), createdAt: row.created_at }))
}

export function clearChatHistory(db: Db, userId: string): void {
  db.prepare('delete from chat_messages where user_id = ?').run(userId)
}
