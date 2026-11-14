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
  tasteStats,
  updateProfileFlags,
  wishlistIds,
} from '../shared/library-store.ts'
import { createSessionForUser, deleteOtherSessions, deleteSession, findUserBySession, listSessions } from '../shared/session-store.ts'
import { findProfile, loadLikesOfSimilarUsers } from '../shared/user-store.ts'

const now = new Date('2026-11-12T10:00:00Z')

function setup() {
  const db = openDatabase(':memory:')
  const dune = insertBook(db, { title: 'Dune', authors: ['Frank Herbert'], genres: ['science_fiction'], popularity: 50, isbn: '9780000000011', embedding: [1, 0, 0] })
  const emma = insertBook(db, { title: 'Emma', authors: ['Jane Austen'], genres: ['classics'], popularity: 10, isbn: '9780000000028', embedding: [0, 1, 0] })
  const hyperion = insertBook(db, { title: 'Hyperion', authors: ['Dan Simmons'], genres: ['science_fiction'], popularity: 30, embedding: [0.9, 0.1, 0] })
  const plain = insertBook(db, { title: '100% Pure_Fun', popularity: 1 })
  insertUser(db, 'u1')
  insertUser(db, 'u2')
  return { db, dune, emma, hyperion, plain }
}

describe('books store', () => {
  it('searches by title, author and isbn and orders by popularity', async () => {
    const { db, dune, emma } = setup()
    expect(searchBooks(db, 'dune', 10).map((book) => book.id)).toEqual([dune])
    expect(searchBooks(db, 'AUSTEN', 10).map((book) => book.id)).toEqual([emma])
    expect(searchBooks(db, '978-0-00-000002-8', 10).map((book) => book.id)).toEqual([emma])
    expect(searchBooks(db, 'nothing like this', 10)).toEqual([])
    expect(searchBooks(db, '  ', 10)).toEqual([])
  })

  it('treats percent and underscore in the query literally', async () => {
    const { db, plain } = setup()
    expect(searchBooks(db, '100%', 10).map((book) => book.id)).toEqual([plain])
    expect(searchBooks(db, '%', 10)).toHaveLength(1)
  })

  it('returns popular books filtered by interests and excluded ids', async () => {
    const { db, dune, hyperion } = setup()
    expect(popularBooks(db, ['science_fiction'], 10, []).map((book) => book.id)).toEqual([dune, hyperion])
    expect(popularBooks(db, ['science_fiction'], 10, [dune]).map((book) => book.id)).toEqual([hyperion])
    expect(popularBooks(db, [], 2, [])).toHaveLength(2)
  })

  it('finds nearest books by cosine similarity with exclusion and genre filter', async () => {
    const { db, dune, emma, hyperion } = setup()
    expect(matchBooks(db, [1, 0, 0], 3, [], null).map((book) => book.id)).toEqual([dune, hyperion, emma])
    expect(matchBooks(db, [1, 0, 0], 3, [dune], null).map((book) => book.id)).toEqual([hyperion, emma])
    expect(matchBooks(db, [1, 0, 0], 3, [], ['classics']).map((book) => book.id)).toEqual([emma])
    expect(matchBooks(db, [0, 0, 0], 3, [], null)).toEqual([])
  })

  it('refreshes the vector index after new embeddings are stored', async () => {
    const { db, dune } = setup()
    matchBooks(db, [1, 0, 0], 3, [], null)
    const late = insertBook(db, { title: 'Late', genres: ['fantasy'], embedding: [1, 0, 0.01] })
    const ids = matchBooks(db, [1, 0, 0], 3, [], null).map((book) => book.id)
    expect(ids).toContain(late)
    expect(ids).toContain(dune)
  })

  it('loads books with decoded embeddings in the requested order', async () => {
    const { db, dune, emma } = setup()
    const books = loadBooks(db, [emma, dune, 'missing'])
    expect(books.map((book) => book.id)).toEqual([emma, dune])
    expect(books[1]?.embedding).toEqual([1, 0, 0])
  })
})

describe('library store', () => {
  it('upserts and removes ratings', async () => {
    const { db, dune } = setup()
    setRating(db, 'u1', dune, 1, true, now)
    setRating(db, 'u1', dune, -1, false, now)
    expect(ratingMap(db, 'u1')).toEqual({ [dune]: -1 })
    removeRating(db, 'u1', dune)
    expect(ratingMap(db, 'u1')).toEqual({})
  })

  it('keeps the wishlist unique per book', async () => {
    const { db, dune } = setup()
    addToWishlist(db, 'u1', dune, now)
    addToWishlist(db, 'u1', dune, now)
    expect(wishlistIds(db, 'u1')).toEqual([dune])
  })

  it('saves the profile, keeps consent on later saves and updates flags', async () => {
    const { db } = setup()
    expect(findProfile(db, 'u1')).toBeNull()
    expect(updateProfileFlags(db, 'u1', { personalizationEnabled: false })).toBe(false)
    saveProfile(db, 'u1', ['fantasy'], true, now)
    saveProfile(db, 'u1', ['mystery'], false, now)
    const consent = db.prepare('select consent_at from profiles where user_id = ?').get('u1') as { consent_at: string }
    expect(consent.consent_at).toBe(now.toISOString())
    expect(updateProfileFlags(db, 'u1', { personalizationEnabled: false })).toBe(true)
    expect(findProfile(db, 'u1')).toEqual({ interests: ['mystery'], personalizationEnabled: false, aiDescriptionsEnabled: true, maxAge: null })
  })

  it('computes taste stats from real ratings', async () => {
    const { db, dune, emma, hyperion } = setup()
    setRating(db, 'u1', dune, 1, true, now)
    setRating(db, 'u1', hyperion, 1, true, now)
    setRating(db, 'u1', emma, -1, false, now)
    expect(tasteStats(db, 'u1')).toEqual({ readCount: 2, likedCount: 2, topGenres: ['science_fiction'] })
  })

  it('finds likes of users who share a liked book', async () => {
    const { db, dune, emma, hyperion } = setup()
    setRating(db, 'u1', dune, 1, false, now)
    setRating(db, 'u2', dune, 1, false, now)
    setRating(db, 'u2', hyperion, 1, false, now)
    setRating(db, 'u2', emma, -1, false, now)
    const likes = loadLikesOfSimilarUsers(db, 'u1', [dune], 10)
    expect([...(likes.get('u2') ?? [])].sort()).toEqual([dune, hyperion].sort())
    expect(likes.has('u1')).toBe(false)
  })
})

describe('sessions', () => {
  it('finds the user only by the original token and stores only a hash', () => {
    const { db } = setup()
    const token = createSessionForUser(db, 'u1', now)
    expect(findUserBySession(db, token, now)).toBe('u1')
    expect(findUserBySession(db, 'wrong', now)).toBeNull()
    const stored = db.prepare('select token_hash from sessions where user_id = ?').get('u1') as { token_hash: string }
    expect(stored.token_hash).not.toBe(token)
  })

  it('expires sessions after a year', () => {
    const { db } = setup()
    const token = createSessionForUser(db, 'u1', now)
    expect(findUserBySession(db, token, new Date(now.getTime() + 364 * 24 * 60 * 60 * 1000))).toBe('u1')
    expect(findUserBySession(db, token, new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000))).toBeNull()
  })

  it('deletes one session or all but one', () => {
    const { db } = setup()
    const first = createSessionForUser(db, 'u1', now)
    const second = createSessionForUser(db, 'u1', now)
    const third = createSessionForUser(db, 'u1', now)
    deleteSession(db, first)
    expect(findUserBySession(db, first, now)).toBeNull()
    deleteOtherSessions(db, 'u1', second)
    expect(findUserBySession(db, second, now)).toBe('u1')
    expect(findUserBySession(db, third, now)).toBeNull()
  })
})

describe('chat and book of the day storage', () => {
  it('counts only user messages of the last hour', async () => {
    const { db } = setup()
    saveExchange(db, 'u1', 'hi', 'hello', [], new Date(now.getTime() - 2 * 60 * 60 * 1000))
    saveExchange(db, 'u1', 'again', 'ok', [], new Date(now.getTime() - 5 * 60 * 1000))
    expect(countRecentUserMessages(db, 'u1', now)).toBe(1)
  })

  it('keeps the first row for a day on conflicting inserts', async () => {
    const { db, dune, emma } = setup()
    insertRow(db, 'u1', '2026-11-12', { bookId: dune, score: 0.9, description: 'a', model: 'm' }, now)
    insertRow(db, 'u1', '2026-11-12', { bookId: emma, score: 0.1, description: 'b', model: null }, now)
    expect(findRow(db, 'u1', '2026-11-12')).toEqual({ bookId: dune, score: 0.9, description: 'a', model: 'm' })
    expect(previousBookIds(db, 'u1', '2026-11-12')).toEqual([])
    expect(previousBookIds(db, 'u1', '2026-11-13')).toEqual([dune])
    expect(previousBookIds(db, 'u2', '2026-11-13')).toEqual([])
  })
})

describe('account deletion with a real database', () => {
  it('leaves no rows of the user in any table and keeps other users', async () => {
    const { db, dune } = setup()
    for (const user of ['u1', 'u2']) {
      setRating(db, user, dune, 1, true, now)
      addToWishlist(db, user, dune, now)
      db.prepare("insert into book_status (user_id, book_id, status, updated_at) values (?, ?, 'reading', ?)").run(user, dune, now.toISOString())
      saveProfile(db, user, ['fantasy'], true, now)
      saveExchange(db, user, 'q', 'a', [dune], now)
      insertRow(db, user, '2026-11-12', { bookId: dune, score: 0.5, description: null, model: null }, now)
    }
    deleteUserData(createAccountStore(db), 'u1')
    for (const table of USER_TABLES) {
      const own = db.prepare(`select count(*) as c from ${table} where user_id = ?`).get('u1') as { c: number }
      const others = db.prepare(`select count(*) as c from ${table} where user_id = ?`).get('u2') as { c: number }
      expect(own.c).toBe(0)
      expect(others.c).toBeGreaterThan(0)
    }
    expect(db.prepare('select count(*) as c from users where id = ?').get('u1')).toEqual({ c: 0 })
    expect(db.prepare('select count(*) as c from users where id = ?').get('u2')).toEqual({ c: 1 })
  })
})

describe('schema versioning', () => {
  it('marks a fresh database with the latest version', () => {
    const db = openDatabase(':memory:')
    expect(currentVersion(db)).toBe(SCHEMA_VERSION)
  })

  it('upgrades a database made before the age and terms columns and records the version', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'folio-version-')), 'old.db')
    const old = new DatabaseSync(path)
    old.exec(`
      create table users (id text primary key, username text, password_hash text, recovery_hash text, created_at text not null);
      create table sessions (token_hash text primary key, user_id text not null, created_at text not null, expires_at text not null);
      create table books (id text primary key, isbn_13 text unique, source_key text not null unique, title text not null, authors text not null default '[]', description text, genres text not null default '[]', language text not null, first_publish_year integer, popularity integer not null default 0, embedding blob);
      create table profiles (user_id text primary key, interests text not null default '[]', personalization_enabled integer not null default 1, ai_descriptions_enabled integer not null default 1, consent_at text);
    `)
    old.close()
    const db = openDatabase(path)
    const columns = (table: string) => (db.prepare(`pragma table_info(${table})`).all() as { name: string }[]).map((column) => column.name)
    expect(columns('users')).toEqual(expect.arrayContaining(['terms_version', 'terms_accepted_at']))
    expect(columns('books')).toContain('min_age')
    expect(columns('profiles')).toContain('max_age')
    expect(columns('sessions')).toEqual(expect.arrayContaining(['last_seen_at', 'user_agent']))
    expect(currentVersion(db)).toBe(SCHEMA_VERSION)
    db.close()
    const again = openDatabase(path)
    expect(currentVersion(again)).toBe(SCHEMA_VERSION)
    again.close()
  })
})

describe('session columns migration', () => {
  it('adds the activity columns to a database created before them', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'folio-migrate-')), 'old.db')
    const old = new DatabaseSync(path)
    old.exec('create table sessions (token_hash text primary key, user_id text not null, created_at text not null, expires_at text not null)')
    old.close()
    const db = openDatabase(path)
    const columns = (db.prepare('pragma table_info(sessions)').all() as { name: string }[]).map((column) => column.name)
    expect(columns).toEqual(expect.arrayContaining(['last_seen_at', 'user_agent']))
    db.close()
  })
})

describe('session activity', () => {
  it('records the user agent and refreshes the last seen time at most every ten minutes', () => {
    const db = openDatabase(':memory:')
    db.prepare("insert into users (id, username, password_hash, recovery_hash, created_at) values ('u', 'u1', 'h', 'r', '2026-01-01T00:00:00.000Z')").run()
    const start = new Date('2026-06-01T10:00:00.000Z')
    const token = createSessionForUser(db, 'u', start, 'Agent/1')
    expect(findUserBySession(db, token, new Date('2026-06-01T10:05:00.000Z'))).toBe('u')
    expect(listSessions(db, 'u', token, start)[0]?.lastSeenAt).toBe(start.toISOString())
    expect(findUserBySession(db, token, new Date('2026-06-01T10:20:00.000Z'))).toBe('u')
    const [session] = listSessions(db, 'u', token, new Date('2026-06-01T10:21:00.000Z'))
    expect(session?.lastSeenAt).toBe('2026-06-01T10:20:00.000Z')
    expect(session?.userAgent).toBe('Agent/1')
    expect(session?.current).toBe(true)
  })

  it('cuts very long user agents', () => {
    const db = openDatabase(':memory:')
    db.prepare("insert into users (id, username, password_hash, recovery_hash, created_at) values ('u', 'u1', 'h', 'r', '2026-01-01T00:00:00.000Z')").run()
    createSessionForUser(db, 'u', new Date('2026-06-01T10:00:00.000Z'), 'x'.repeat(5000))
    expect(listSessions(db, 'u', null, new Date('2026-06-01T10:00:00.000Z'))[0]?.userAgent).toHaveLength(200)
  })
})
