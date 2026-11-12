import { describe, expect, it } from 'vitest'
import { openDatabase } from './database.ts'
import { insertBook, insertUser } from './test-fixtures.ts'
import { USER_TABLES, deleteUserData } from '../account/delete-account.ts'
import { createAccountStore } from '../account/account-store.ts'
import { countRecentUserMessages, saveExchange } from '../chat/chat-store.ts'
import { findRow, insertRow, recentBookIds } from '../book-of-day/book-of-day-store.ts'
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
import { createGuest, createSessionForUser, deleteOtherSessions, deleteSession, findUserBySession } from '../shared/session-store.ts'
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
    expect((await searchBooks(db, 'dune', 10)).map((book) => book.id)).toEqual([dune])
    expect((await searchBooks(db, 'AUSTEN', 10)).map((book) => book.id)).toEqual([emma])
    expect((await searchBooks(db, '978-0-00-000002-8', 10)).map((book) => book.id)).toEqual([emma])
    expect(await searchBooks(db, 'nothing like this', 10)).toEqual([])
    expect(await searchBooks(db, '  ', 10)).toEqual([])
  })

  it('treats percent and underscore in the query literally', async () => {
    const { db, plain } = setup()
    expect((await searchBooks(db, '100%', 10)).map((book) => book.id)).toEqual([plain])
    expect(await searchBooks(db, '%', 10)).toHaveLength(1)
  })

  it('returns popular books filtered by interests and excluded ids', async () => {
    const { db, dune, hyperion } = setup()
    expect((await popularBooks(db, ['science_fiction'], 10, [])).map((book) => book.id)).toEqual([dune, hyperion])
    expect((await popularBooks(db, ['science_fiction'], 10, [dune])).map((book) => book.id)).toEqual([hyperion])
    expect(await popularBooks(db, [], 2, [])).toHaveLength(2)
  })

  it('finds nearest books by cosine similarity with exclusion and genre filter', async () => {
    const { db, dune, emma, hyperion } = setup()
    expect((await matchBooks(db, [1, 0, 0], 3, [], null)).map((book) => book.id)).toEqual([dune, hyperion, emma])
    expect((await matchBooks(db, [1, 0, 0], 3, [dune], null)).map((book) => book.id)).toEqual([hyperion, emma])
    expect((await matchBooks(db, [1, 0, 0], 3, [], ['classics'])).map((book) => book.id)).toEqual([emma])
    expect(await matchBooks(db, [0, 0, 0], 3, [], null)).toEqual([])
  })

  it('refreshes the vector index after new embeddings are stored', async () => {
    const { db, dune } = setup()
    await matchBooks(db, [1, 0, 0], 3, [], null)
    const late = insertBook(db, { title: 'Late', genres: ['fantasy'], embedding: [1, 0, 0.01] })
    const ids = (await matchBooks(db, [1, 0, 0], 3, [], null)).map((book) => book.id)
    expect(ids).toContain(late)
    expect(ids).toContain(dune)
  })

  it('loads books with decoded embeddings in the requested order', async () => {
    const { db, dune, emma } = setup()
    const books = await loadBooks(db, [emma, dune, 'missing'])
    expect(books.map((book) => book.id)).toEqual([emma, dune])
    expect(books[1]?.embedding).toEqual([1, 0, 0])
  })
})

describe('library store', () => {
  it('upserts and removes ratings', async () => {
    const { db, dune } = setup()
    await setRating(db, 'u1', dune, 1, true, now)
    await setRating(db, 'u1', dune, -1, false, now)
    expect(await ratingMap(db, 'u1')).toEqual({ [dune]: -1 })
    await removeRating(db, 'u1', dune)
    expect(await ratingMap(db, 'u1')).toEqual({})
  })

  it('keeps the wishlist unique per book', async () => {
    const { db, dune } = setup()
    await addToWishlist(db, 'u1', dune, now)
    await addToWishlist(db, 'u1', dune, now)
    expect(await wishlistIds(db, 'u1')).toEqual([dune])
  })

  it('saves the profile, keeps consent on later saves and updates flags', async () => {
    const { db } = setup()
    expect(await findProfile(db, 'u1')).toBeNull()
    expect(await updateProfileFlags(db, 'u1', { personalizationEnabled: false })).toBe(false)
    await saveProfile(db, 'u1', ['fantasy'], true, now)
    await saveProfile(db, 'u1', ['mystery'], false, now)
    const consent = db.prepare('select consent_at from profiles where user_id = ?').get('u1') as { consent_at: string }
    expect(consent.consent_at).toBe(now.toISOString())
    expect(await updateProfileFlags(db, 'u1', { personalizationEnabled: false })).toBe(true)
    expect(await findProfile(db, 'u1')).toEqual({ interests: ['mystery'], personalizationEnabled: false, aiDescriptionsEnabled: true })
  })

  it('computes taste stats from real ratings', async () => {
    const { db, dune, emma, hyperion } = setup()
    await setRating(db, 'u1', dune, 1, true, now)
    await setRating(db, 'u1', hyperion, 1, true, now)
    await setRating(db, 'u1', emma, -1, false, now)
    expect(await tasteStats(db, 'u1')).toEqual({ readCount: 2, likedCount: 2, topGenres: ['science_fiction'] })
  })

  it('finds likes of users who share a liked book', async () => {
    const { db, dune, emma, hyperion } = setup()
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
  it('finds the user only by the original token and stores only a hash', () => {
    const { db } = setup()
    const session = createGuest(db, now)
    expect(findUserBySession(db, session.token, now)).toBe(session.userId)
    expect(findUserBySession(db, 'wrong', now)).toBeNull()
    const stored = db.prepare('select token_hash from sessions where user_id = ?').get(session.userId) as { token_hash: string }
    expect(stored.token_hash).not.toBe(session.token)
  })

  it('expires sessions after a year', () => {
    const { db } = setup()
    const session = createGuest(db, now)
    expect(findUserBySession(db, session.token, new Date(now.getTime() + 364 * 24 * 60 * 60 * 1000))).toBe(session.userId)
    expect(findUserBySession(db, session.token, new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000))).toBeNull()
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
    await saveExchange(db, 'u1', 'hi', 'hello', [], new Date(now.getTime() - 2 * 60 * 60 * 1000))
    await saveExchange(db, 'u1', 'again', 'ok', [], new Date(now.getTime() - 5 * 60 * 1000))
    expect(await countRecentUserMessages(db, 'u1', now)).toBe(1)
  })

  it('keeps the first row for a day on conflicting inserts', async () => {
    const { db, dune, emma } = setup()
    await insertRow(db, 'u1', '2026-11-12', { bookId: dune, score: 0.9, description: 'a', model: 'm' }, now)
    await insertRow(db, 'u1', '2026-11-12', { bookId: emma, score: 0.1, description: 'b', model: null }, now)
    expect(await findRow(db, 'u1', '2026-11-12')).toEqual({ bookId: dune, score: 0.9, description: 'a', model: 'm' })
    expect(await recentBookIds(db, 'u1', '2026-10-01', '2026-11-12')).toEqual([])
    expect(await recentBookIds(db, 'u1', '2026-10-01', '2026-11-13')).toEqual([dune])
  })
})

describe('account deletion with a real database', () => {
  it('leaves no rows of the user in any table and keeps other users', async () => {
    const { db, dune } = setup()
    for (const user of ['u1', 'u2']) {
      await setRating(db, user, dune, 1, true, now)
      await addToWishlist(db, user, dune, now)
      await saveProfile(db, user, ['fantasy'], true, now)
      await saveExchange(db, user, 'q', 'a', [dune], now)
      await insertRow(db, user, '2026-11-12', { bookId: dune, score: 0.5, description: null, model: null }, now)
    }
    await deleteUserData(createAccountStore(db), 'u1')
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
