import type { Db } from '../db/database.ts'
import { requireUser, type RouteContext } from './context.ts'
import { parseStringList } from '../shared/json-column.ts'

type Row = Record<string, unknown>

async function rows(db: Db, sql: string, userId: string): Promise<Row[]> {
  return await db.all<Row>(sql, userId)
}

export async function getExport(ctx: RouteContext): Promise<Response> {
  const userId = await requireUser(ctx)
  const { db } = ctx.deps
  const account = await db.get<Row>('select username, created_at from users where id = ?', userId)
  const profile = await db.get<Row>(
    'select interests, personalization_enabled, ai_descriptions_enabled, max_age, consent_at from profiles where user_id = ?',
    userId,
  )
  return Response.json({
    account,
    profile: profile ? { ...profile, interests: parseStringList(String(profile.interests)) } : null,
    ratings: await rows(
      db,
      'select books.title as title, ratings.value as value, ratings.is_read as is_read, ratings.created_at as created_at from ratings join books on books.id = ratings.book_id where ratings.user_id = ? order by ratings.created_at',
      userId,
    ),
    wishlist: await rows(
      db,
      'select books.title as title, wishlist.created_at as created_at from wishlist join books on books.id = wishlist.book_id where wishlist.user_id = ? order by wishlist.created_at',
      userId,
    ),
    bookOfDay: await rows(
      db,
      'select book_of_day.day as day, books.title as title, book_of_day.description as description from book_of_day join books on books.id = book_of_day.book_id where book_of_day.user_id = ? order by book_of_day.day',
      userId,
    ),
    shelf: await rows(
      db,
      'select books.title as title, book_status.status as status, book_status.updated_at as updated_at from book_status join books on books.id = book_status.book_id where book_status.user_id = ? order by book_status.updated_at',
      userId,
    ),
    chatMessages: await rows(db, 'select role, content, created_at from chat_messages where user_id = ? order by created_at', userId),
  })
}
