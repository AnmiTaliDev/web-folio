import type { Db } from '../db/database.ts'
import type { BookOfDayRow } from './book-of-day.ts'

type Row = { book_id: string; score: number; description: string | null; model: string | null }

export async function findRow(db: Db, userId: string, day: string): Promise<BookOfDayRow | null> {
  const row = db.prepare('select book_id, score, description, model from book_of_day where user_id = ? and day = ?').get(userId, day) as
    | Row
    | undefined
  return row ? { bookId: row.book_id, score: row.score, description: row.description, model: row.model } : null
}

export async function recentBookIds(db: Db, userId: string, sinceDay: string, beforeDay: string): Promise<string[]> {
  const rows = db
    .prepare('select book_id from book_of_day where user_id = ? and day >= ? and day < ?')
    .all(userId, sinceDay, beforeDay) as { book_id: string }[]
  return rows.map((row) => row.book_id)
}

export async function insertRow(db: Db, userId: string, day: string, row: BookOfDayRow, now: Date): Promise<void> {
  db.prepare(
    `insert into book_of_day (user_id, day, book_id, score, description, model, created_at) values (?, ?, ?, ?, ?, ?, ?)
     on conflict (user_id, day) do nothing`,
  ).run(userId, day, row.bookId, row.score, row.description, row.model, now.toISOString())
}
