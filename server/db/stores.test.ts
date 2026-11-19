import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { openDatabase } from './database.ts'
import { currentVersion, SCHEMA_VERSION } from './migrations.ts'
import { insertBook, insertUser } from './test-fixtures.ts'
import { USER_TABLES, deleteUserData } from '../account/delete-account.ts'
import { createAccountStore } from '../account/account-store.ts'
import { countRecentUserMessages, saveExchange } from '../chat/chat-store.ts'
import { findRow, insertRow, previousBookIds } from '../book-of-day/book-of-day-store.ts'
import { loadBooks, matchBooks, popularBooks, searchBooks } from '../shared/books-store.ts'
import {
  addToWishlist,
  ratingMap,
  removeRating,
  saveProfile,
  setRating,
  setShelfStatus,
  tasteStats,
  updateProfileFlags,
  wishlistIds,
} from '../shared/library-store.ts'
import { createSessionForUser, deleteOtherSessions, deleteSession, findUserBySession, listSessions } from '../shared/session-store.ts'
import { findProfile, loadLikesOfSimilarUsers } from '../shared/user-store.ts'

const now = new Date('2026-11-12T10:00:00Z')

async function setup() {
  const db = await openDatabase(':memory:')
  const dune = await insertBook(db, { title: 'Dune', authors: ['Frank Herbert'], genres: ['science_fiction'], popularity: 50, isbn: '9780000000011', embedding: [1, 0, 0] })
  const emma = await insertBook(db, { title: 'Emma', authors: ['Jane Austen'], genres: ['classics'], popularity: 10, isbn: '9780000000028', embedding: [0, 1, 0] })
  const hyperion = await insertBook(db, { title: 'Hyperion', authors: ['Dan Simmons'], genres: ['science_fiction'], popularity: 30, embedding: [0.9, 0.1, 0] })
  const plain = await insertBook(db, { title: '100% Pure_Fun', popularity: 1 })
  await insertUser(db, 'u1')
  await insertUser(db, 'u2')
  return { db, dune, emma, hyperion, plain }
}

describe('books store', () => {
  it('searches by title, author and isbn and orders by popularity', async () => {
    const { db, dune, emma } = await setup()
    expect((await searchBooks(db, 'dune', 10)).map((book) => book.id)).toEqual([dune])
    expect((await searchBooks(db, 'AUSTEN', 10)).map((book) => book.id)).toEqual([emma])
    expect((await searchBooks(db, '978-0-00-000002-8', 10)).map((book) => book.id)).toEqual([emma])
    expect(await searchBooks(db, 'nothing like this', 10)).toEqual([])
    expect(await searchBooks(db, '  ', 10)).toEqual([])
  })

  it('treats percent and underscore in the query literally', async () => {
    const { db, plain } = await setup()
    expect((await searchBooks(db, '100%', 10)).map((book) => book.id)).toEqual([plain])
    expect(await searchBooks(db, '%', 10)).toHaveLength(1)
  })

  it('returns popular books filtered by interests and excluded ids', async () => {
    const { db, dune, hyperion } = await setup()
    expect((await popularBooks(db, ['science_fiction'], 10, [])).map((book) => book.id)).toEqual([dune, hyperion])
    expect((await popularBooks(db, ['science_fiction'], 10, [dune])).map((book) => book.id)).toEqual([hyperion])
    expect(await popularBooks(db, [], 2, [])).toHaveLength(2)
  })

  it('finds nearest books by cosine similarity with exclusion and genre filter', async () => {
    const { db, dune, emma, hyperion } = await setup()
    expect((await matchBooks(db, [1, 0, 0], 3, [], null)).map((book) => book.id)).toEqual([dune, hyperion, emma])
    expect((await matchBooks(db, [1, 0, 0], 3, [dune], null)).map((book) => book.id)).toEqual([hyperion, emma])
    expect((await matchBooks(db, [1, 0, 0], 3, [], ['classics'])).map((book) => book.id)).toEqual([emma])
    expect(await matchBooks(db, [0, 0, 0], 3, [], null)).toEqual([])
  })

  it('refreshes the vector index after new embeddings are stored', async () => {
    const { db, dune } = await setup()
    await matchBooks(db, [1, 0, 0], 3, [], null)
    const late = await insertBook(db, { title: 'Late', genres: ['fantasy'], embedding: [1, 0, 0.01] })
    const ids = (await matchBooks(db, [1, 0, 0], 3, [], null)).map((book) => book.id)
    expect(ids).toContain(late)
    expect(ids).toContain(dune)
  })

  it('loads books with decoded embeddings in the requested order', async () => {
    const { db, dune, emma } = await setup()
    const books = await loadBooks(db, [emma, dune, 'missing'])
    expect(books.map((book) => book.id)).toEqual([emma, dune])
    expect(books[1]?.embedding).toEqual([1, 0, 0])
  })
})

describe('library store', () => {
  it('upserts and removes ratings', async () => {
    const { db, dune } = await setup()
    await setRating(db, 'u1', dune, 1, true, now)
    await setRating(db, 'u1', dune, -1, false, now)
    expect(await ratingMap(db, 'u1')).toEqual({ [dune]: -1 })
    await removeRating(db, 'u1', dune)
    expect(await ratingMap(db, 'u1')).toEqual({})
  })

  it('keeps the wishlist unique per book', async () => {
    const { db, dune } = await setup()
    await addToWishlist(db, 'u1', dune, now)
    await addToWishlist(db, 'u1', dune, now)
    expect(await wishlistIds(db, 'u1')).toEqual([dune])
  })

  it('saves the profile, keeps consent on later saves and updates flags', async () => {
    const { db } = await setup()
    expect(await findProfile(db, 'u1')).toBeNull()
    expect(await updateProfileFlags(db, 'u1', { personalizationEnabled: false })).toBe(false)
    await saveProfile(db, 'u1', ['fantasy'], true, now)
    await saveProfile(db, 'u1', ['mystery'], false, now)
    const consent = await db.get('select consent_at from profiles where user_id = ?', 'u1') as { consent_at: string }
    expect(consent.consent_at).toBe(now.toISOString())
    expect(await updateProfileFlags(db, 'u1', { personalizationEnabled: false })).toBe(true)
    expect(await findProfile(db, 'u1')).toEqual({ interests: ['mystery'], personalizationEnabled: false, aiDescriptionsEnabled: true, maxAge: null })
  })

  it('computes taste stats from real ratings', async () => {
    const { db, dune, emma, hyperion } = await setup()
    await setRating(db, 'u1', dune, 1, true, now)
    await setRating(db, 'u1', hyperion, 1, true, now)
    await setRating(db, 'u1', emma, -1, false, now)
    expect(await tasteStats(db, 'u1')).toEqual({ readCount: 2, likedCount: 2, topGenres: ['science_fiction'] })
  })

  it('counts books marked as read on the shelf in the taste stats', async () => {
    const { db, dune, emma, hyperion } = await setup()
    await setRating(db, 'u1', dune, 1, true, now)
    await setShelfStatus(db, 'u1', dune, 'read', now)
    await setShelfStatus(db, 'u1', emma, 'read', now)
    await setShelfStatus(db, 'u1', hyperion, 'reading', now)
    expect((await tasteStats(db, 'u1')).readCount).toBe(2)
  })

  it('finds likes of users who share a liked book', async () => {
    const { db, dune, emma, hyperion } = await setup()
    await setRating(db, 'u1', dune, 1, false, now)
    await setRating(db, 'u2', dune, 1, false, now)
    await setRating(db, 'u2', hyperion, 1, false, now)
    await setRating(db, 'u2', emma, -1, false, now)
    const likes = await loadLikesOfSimilarUsers(db, 'u1', [dune], 10)
    expect([...(likes.get('u2') ?? [])].sort()).toEqual([dune, hyperion].sort())
    expect(likes.has('u1')).toBe(false)
  })
})

describe('sessions', () => {
  it('finds the user only by the original token and stores only a hash', async () => {
    const { db } = await setup()
    const token = await createSessionForUser(db, 'u1', now)
    expect(await findUserBySession(db, token, now)).toBe('u1')
    expect(await findUserBySession(db, 'wrong', now)).toBeNull()
    const stored = await db.get('select token_hash from sessions where user_id = ?', 'u1') as { token_hash: string }
    expect(stored.token_hash).not.toBe(token)
  })

  it('expires sessions after a year', async () => {
    const { db } = await setup()
    const token = await createSessionForUser(db, 'u1', now)
    expect(await findUserBySession(db, token, new Date(now.getTime() + 364 * 24 * 60 * 60 * 1000))).toBe('u1')
    expect(await findUserBySession(db, token, new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000))).toBeNull()
  })

  it('deletes one session or all but one', async () => {
    const { db } = await setup()
    const first = await createSessionForUser(db, 'u1', now)
    const second = await createSessionForUser(db, 'u1', now)
    const third = await createSessionForUser(db, 'u1', now)
    await deleteSession(db, first)
    expect(await findUserBySession(db, first, now)).toBeNull()
    await deleteOtherSessions(db, 'u1', second)
    expect(await findUserBySession(db, second, now)).toBe('u1')
    expect(await findUserBySession(db, third, now)).toBeNull()
  })
})

describe('chat and book of the day storage', () => {
  it('counts only user messages of the last hour', async () => {
    const { db } = await setup()
    await saveExchange(db, 'u1', 'hi', 'hello', [], new Date(now.getTime() - 2 * 60 * 60 * 1000))
    await saveExchange(db, 'u1', 'again', 'ok', [], new Date(now.getTime() - 5 * 60 * 1000))
    expect(await countRecentUserMessages(db, 'u1', now)).toBe(1)
  })

  it('keeps the first row for a day on conflicting inserts', async () => {
    const { db, dune, emma } = await setup()
    await insertRow(db, 'u1', '2026-11-12', { bookId: dune, score: 0.9, description: 'a', model: 'm' }, now)
    await insertRow(db, 'u1', '2026-11-12', { bookId: emma, score: 0.1, description: 'b', model: null }, now)
    expect(await findRow(db, 'u1', '2026-11-12')).toEqual({ bookId: dune, score: 0.9, description: 'a', model: 'm' })
    expect(await previousBookIds(db, 'u1', '2026-11-12')).toEqual([])
    expect(await previousBookIds(db, 'u1', '2026-11-13')).toEqual([dune])
    expect(await previousBookIds(db, 'u2', '2026-11-13')).toEqual([])
  })
})

describe('account deletion with a real database', () => {
  it('leaves no rows of the user in any table and keeps other users', async () => {
    const { db, dune } = await setup()
    for (const user of ['u1', 'u2']) {
      await setRating(db, user, dune, 1, true, now)
      await addToWishlist(db, user, dune, now)
      await db.run("insert into book_status (user_id, book_id, status, updated_at) values (?, ?, 'reading', ?)", user, dune, now.toISOString())
      await saveProfile(db, user, ['fantasy'], true, now)
      await saveExchange(db, user, 'q', 'a', [dune], now)
      await insertRow(db, user, '2026-11-12', { bookId: dune, score: 0.5, description: null, model: null }, now)
    }
    await deleteUserData(createAccountStore(db), 'u1')
    for (const table of USER_TABLES) {
      const own = await db.get(`select count(*) as c from ${table} where user_id = ?`, 'u1') as { c: number }
      const others = await db.get(`select count(*) as c from ${table} where user_id = ?`, 'u2') as { c: number }
      expect(own.c).toBe(0)
      expect(others.c).toBeGreaterThan(0)
    }
    expect(await db.get('select count(*) as c from users where id = ?', 'u1')).toEqual({ c: 0 })
    expect(await db.get('select count(*) as c from users where id = ?', 'u2')).toEqual({ c: 1 })
  })
})

describe('schema versioning', () => {
  it('marks a fresh database with the latest version', async () => {
    const db = await openDatabase(':memory:')
    expect(await currentVersion(db)).toBe(SCHEMA_VERSION)
  })

  it('upgrades a database made before the age and terms columns and records the version', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'folio-version-')), 'old.db')
    const old = new DatabaseSync(path)
    old.exec(`
      create table users (id text primary key, username text, password_hash text, recovery_hash text, created_at text not null);
      create table sessions (token_hash text primary key, user_id text not null, created_at text not null, expires_at text not null);
      create table books (id text primary key, isbn_13 text unique, source_key text not null unique, title text not null, authors text not null default '[]', description text, genres text not null default '[]', language text not null, first_publish_year integer, popularity integer not null default 0, embedding blob);
      create table profiles (user_id text primary key, interests text not null default '[]', personalization_enabled integer not null default 1, ai_descriptions_enabled integer not null default 1, consent_at text);
    `)
    old.close()
    const db = await openDatabase(path)
    const columns = async (table: string) => ((await db.all(`pragma table_info(${table})`)) as { name: string }[]).map((column) => column.name)
    expect(await columns('users')).toEqual(expect.arrayContaining(['terms_version', 'terms_accepted_at']))
    expect(await columns('books')).toContain('min_age')
    expect(await columns('profiles')).toContain('max_age')
    expect(await columns('sessions')).toEqual(expect.arrayContaining(['last_seen_at', 'user_agent']))
    expect(await currentVersion(db)).toBe(SCHEMA_VERSION)
    db.close()
    const again = await openDatabase(path)
    expect(await currentVersion(again)).toBe(SCHEMA_VERSION)
    again.close()
  })
})

describe('session columns migration', () => {
  it('adds the activity columns to a database created before them', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'folio-migrate-')), 'old.db')
    const old = new DatabaseSync(path)
    old.exec('create table sessions (token_hash text primary key, user_id text not null, created_at text not null, expires_at text not null)')
    old.close()
    const db = await openDatabase(path)
    const columns = (await db.all('pragma table_info(sessions)') as { name: string }[]).map((column) => column.name)
    expect(columns).toEqual(expect.arrayContaining(['last_seen_at', 'user_agent']))
    db.close()
  })
})

describe('session activity', () => {
  it('records the user agent and refreshes the last seen time at most every ten minutes', async () => {
    const db = await openDatabase(':memory:')
    await db.run("insert into users (id, username, password_hash, recovery_hash, created_at) values ('u', 'u1', 'h', 'r', '2026-01-01T00:00:00.000Z')")
    const start = new Date('2026-06-01T10:00:00.000Z')
    const token = await createSessionForUser(db, 'u', start, 'Agent/1')
    expect(await findUserBySession(db, token, new Date('2026-06-01T10:05:00.000Z'))).toBe('u')
    expect((await listSessions(db, 'u', token, start))[0]?.lastSeenAt).toBe(start.toISOString())
    expect(await findUserBySession(db, token, new Date('2026-06-01T10:20:00.000Z'))).toBe('u')
    const [session] = await listSessions(db, 'u', token, new Date('2026-06-01T10:21:00.000Z'))
    expect(session?.lastSeenAt).toBe('2026-06-01T10:20:00.000Z')
    expect(session?.userAgent).toBe('Agent/1')
    expect(session?.current).toBe(true)
  })

  it('cuts very long user agents', async () => {
    const db = await openDatabase(':memory:')
    await db.run("insert into users (id, username, password_hash, recovery_hash, created_at) values ('u', 'u1', 'h', 'r', '2026-01-01T00:00:00.000Z')")
    await createSessionForUser(db, 'u', new Date('2026-06-01T10:00:00.000Z'), 'x'.repeat(5000))
    expect((await listSessions(db, 'u', null, new Date('2026-06-01T10:00:00.000Z')))[0]?.userAgent).toHaveLength(200)
  })
})
