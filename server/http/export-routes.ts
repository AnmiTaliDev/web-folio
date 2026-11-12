import type { Db } from '../db/database.ts'
import { requireUser, type RouteContext } from './context.ts'

type Row = Record<string, unknown>

function rows(db: Db, sql: string, userId: string): Row[] {
  return db.prepare(sql).all(userId) as Row[]
}

export async function getExport(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const { db } = ctx.deps
  const account = db.prepare('select username, created_at from users where id = ?').get(userId) as Row
  const profile = db
    .prepare('select interests, personalization_enabled, ai_descriptions_enabled, consent_at from profiles where user_id = ?')
    .get(userId) as Row | undefined
  return Response.json({
    account,
    profile: profile ? { ...profile, interests: JSON.parse(String(profile.interests)) } : null,
    ratings: rows(
      db,
      'select books.title as title, ratings.value as value, ratings.is_read as is_read, ratings.created_at as created_at from ratings join books on books.id = ratings.book_id where ratings.user_id = ? order by ratings.created_at',
      userId,
    ),
    wishlist: rows(
      db,
      'select books.title as title, wishlist.created_at as created_at from wishlist join books on books.id = wishlist.book_id where wishlist.user_id = ? order by wishlist.created_at',
      userId,
    ),
    bookOfDay: rows(
      db,
      'select book_of_day.day as day, books.title as title, book_of_day.description as description from book_of_day join books on books.id = book_of_day.book_id where book_of_day.user_id = ? order by book_of_day.day',
      userId,
    ),
    chatMessages: rows(db, 'select role, content, created_at from chat_messages where user_id = ? order by created_at', userId),
  })
}
