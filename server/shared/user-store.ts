import type { Db } from '../db/database.ts'
import type { Profile, Rating } from './types.ts'

export const DEFAULT_PROFILE: Profile = { interests: [], personalizationEnabled: true, aiDescriptionsEnabled: true }

type ProfileRow = {
  interests: string
  personalization_enabled: number
  ai_descriptions_enabled: number
}

export async function findProfile(db: Db, userId: string): Promise<Profile | null> {
  const row = db
    .prepare('select interests, personalization_enabled, ai_descriptions_enabled from profiles where user_id = ?')
    .get(userId) as ProfileRow | undefined
  if (!row) {
    return null
  }
  return {
    interests: JSON.parse(row.interests) as string[],
    personalizationEnabled: row.personalization_enabled === 1,
    aiDescriptionsEnabled: row.ai_descriptions_enabled === 1,
  }
}

export async function loadProfile(db: Db, userId: string): Promise<Profile> {
  return (await findProfile(db, userId)) ?? DEFAULT_PROFILE
}

export async function loadRatings(db: Db, userId: string): Promise<Rating[]> {
  const rows = db.prepare('select book_id, value from ratings where user_id = ?').all(userId) as { book_id: string; value: number }[]
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
  const others = db
    .prepare(
      `select distinct user_id from ratings
       where value = 1 and user_id != ? and book_id in (select value from json_each(?))
       limit ?`,
    )
    .all(userId, JSON.stringify(likedIds), maxUsers) as { user_id: string }[]
  const select = db.prepare('select book_id from ratings where user_id = ? and value = 1')
  for (const other of others) {
    const rows = select.all(other.user_id) as { book_id: string }[]
    likes.set(other.user_id, new Set(rows.map((row) => row.book_id)))
  }
  return likes
}
