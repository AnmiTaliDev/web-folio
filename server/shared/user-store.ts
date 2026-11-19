import type { Db } from '../db/database.ts'
import { placeholders } from '../db/database.ts'
import type { Profile, Rating } from './types.ts'

import { AGE_LEVELS } from './types.ts'
import type { AgeLimit } from './types.ts'
import { parseStringList } from './json-column.ts'

export const DEFAULT_PROFILE: Profile = { interests: [], personalizationEnabled: true, aiDescriptionsEnabled: true, maxAge: null }

export function parseAgeLimit(value: unknown): AgeLimit {
  const number = typeof value === 'string' ? Number(value) : value
  return AGE_LEVELS.find((level) => level === number) ?? null
}

type ProfileRow = {
  interests: string
  personalization_enabled: number
  ai_descriptions_enabled: number
  max_age: number | null
}

export async function findProfile(db: Db, userId: string): Promise<Profile | null> {
  const row = await db.get<ProfileRow>(
    'select interests, personalization_enabled, ai_descriptions_enabled, max_age from profiles where user_id = ?',
    userId,
  )
  if (!row) {
    return null
  }
  return {
    interests: parseStringList(row.interests),
    personalizationEnabled: row.personalization_enabled === 1,
    aiDescriptionsEnabled: row.ai_descriptions_enabled === 1,
    maxAge: parseAgeLimit(row.max_age),
  }
}

export async function loadProfile(db: Db, userId: string): Promise<Profile> {
  return (await findProfile(db, userId)) ?? DEFAULT_PROFILE
}

export async function loadRatings(db: Db, userId: string): Promise<Rating[]> {
  const rows = await db.all<{ book_id: string; value: number }>('select book_id, value from ratings where user_id = ?', userId)
  return rows.map((row) => ({ bookId: row.book_id, value: row.value as 1 | -1 }))
}

export async function loadLikesOfSimilarUsers(
  db: Db,
  userId: string,
  likedIds: string[],
  maxUsers: number,
): Promise<Map<string, Set<string>>> {
  const likes = new Map<string, Set<string>>()
  if (likedIds.length === 0) {
    return likes
  }
  const others = await db.all<{ user_id: string }>(
    `select distinct user_id from ratings
     where value = 1 and user_id != ? and book_id in (${placeholders(likedIds.length)})
     limit ?`,
    userId,
    ...likedIds,
    maxUsers,
  )
  for (const other of others) {
    const rows = await db.all<{ book_id: string }>('select book_id from ratings where user_id = ? and value = 1', other.user_id)
    likes.set(other.user_id, new Set(rows.map((row) => row.book_id)))
  }
  return likes
}
