import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createThrottle } from '../auth/throttle.ts'
import { openDatabase } from '../db/database.ts'
import { insertBook } from '../db/test-fixtures.ts'
import type { Llm } from '../shared/llm.ts'
import { TERMS_VERSION } from '../shared/terms.ts'
import { createApp } from './app.ts'

let webRoot = ''

beforeAll(async () => {
  webRoot = mkdtempSync(join(tmpdir(), 'folio-web-'))
  writeFileSync(join(webRoot, 'index.html'), '<html>app</html>')
  writeFileSync(join(webRoot, 'main.js'), 'console.log(1)')
})

afterAll(async () => {
  rmSync(webRoot, { recursive: true, force: true })
})

const stubLlm: Llm = {
  model: 'stub',
  completeJson: async () => JSON.stringify({ book_ids: [] }),
  complete: async () => 'Generated blurb.',
  stream: async function* () {
    yield 'Hello'
  },
}

async function makeApp(options: { ai?: boolean } = {}) {
  const db = await openDatabase(':memory:')
  const dune = await insertBook(db, { title: 'Dune', genres: ['science_fiction'], popularity: 50, description: 'Catalog dune.', embedding: [1, 0] })
  const emma = await insertBook(db, { title: 'Emma', authors: ['Jane Austen'], genres: ['classics'], popularity: 10, embedding: [0, 1] })
  const app = createApp(
    {
      db,
      llm: options.ai ? stubLlm : null,
      embed: options.ai ? async () => [1, 0] : null,
      now: () => new Date('2026-11-12T10:00:00Z'),
      throttle: createThrottle(() => new Date('2026-11-12T10:00:00Z')),
    },
    webRoot,
  )
  return { app, db, dune, emma }
}

type App = Awaited<ReturnType<typeof makeApp>>['app']

let accountCounter = 0

async function login(app: App): Promise<string> {
  accountCounter++
  const response = await app(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: `reader${accountCounter}`, password: 'secret password', acceptTerms: true }),
    }),
  )
  expect(response.status).toBe(200)
  const cookie = response.headers.get('set-cookie') ?? ''
  expect(cookie).toContain('HttpOnly')
  return cookie.split(';')[0] ?? ''
}

function call(app: App, cookie: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return app(
    new Request(`http://localhost${path}`, {
      method,
      headers: { cookie, 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}

describe('private mode without an account', () => {
  it('rejects personal endpoints without a session in the common error format', async () => {
    const { app } = await makeApp()
    for (const path of ['/api/recommendations', '/api/ratings', '/api/wishlist', '/api/shelf', '/api/profile', '/api/taste', '/api/me/export']) {
      const response = await app(new Request(`http://localhost${path}`))
      expect(response.status, path).toBe(401)
      expect(await response.json()).toEqual({ error: { code: 'unauthorized', message: 'Missing or invalid session' } })
    }
    expect((await app(new Request('http://localhost/api/chat', { method: 'POST', body: '{}' }))).status).toBe(401)
  })

  it('serves search, popular books, book details and capabilities without a session and sets no cookie', async () => {
    const { app, dune } = await makeApp()
    const search = await app(new Request('http://localhost/api/books/search?q=dune'))
    expect(search.status).toBe(200)
    expect(search.headers.get('set-cookie')).toBeNull()
    expect(((await search.json()) as { title: string }[]).map((book) => book.title)).toEqual(['Dune'])
    const popular = (await (await app(new Request('http://localhost/api/books/popular?interests=science_fiction'))).json()) as { title: string }[]
    expect(popular.map((book) => book.title)).toEqual(['Dune'])
    expect(await (await app(new Request(`http://localhost/api/books/${dune}`))).json()).toMatchObject({ title: 'Dune', description: 'Catalog dune.' })
    expect((await app(new Request('http://localhost/api/capabilities'))).status).toBe(200)
  })

  it('serves book data in the language of the Accept-Language header', async () => {
    const { app, db, dune } = await makeApp()
    await db.run("insert into book_translations (book_id, language, title, authors, description) values (?, 'ru', 'Дюна', '[\"Фрэнк Герберт\"]', 'Русское описание книги про пустынную планету.')", dune)
    const get = async (path: string, language: string) =>
      (await app(new Request(`http://localhost${path}`, { headers: { 'accept-language': language } }))).json() as Promise<Record<string, unknown>>
    expect(await get(`/api/books/${dune}`, 'ru-RU,ru;q=0.9')).toMatchObject({ title: 'Дюна', authors: ['Фрэнк Герберт'], description: 'Русское описание книги про пустынную планету.' })
    expect(await get(`/api/books/${dune}`, 'en-US')).toMatchObject({ title: 'Dune', description: 'Catalog dune.' })
    const found = (await (await app(new Request('http://localhost/api/books/search?q=дюна', { headers: { 'accept-language': 'en' } }))).json()) as { title: string }[]
    expect(found.map((book) => book.title)).toEqual(['Dune'])
  })

  it('browses books by genre with a total and rejects an unknown genre', async () => {
    const { app } = await makeApp()
    const all = (await (await app(new Request('http://localhost/api/books/browse?limit=1'))).json()) as { books: unknown[]; total: number }
    expect(all.books).toHaveLength(1)
    expect(all.total).toBeGreaterThan(1)
    const genre = (await (await app(new Request('http://localhost/api/books/browse?genre=science_fiction'))).json()) as {
      books: { title: string }[]
      total: number
    }
    expect(genre.books.map((book) => book.title)).toEqual(['Dune'])
    expect(genre.total).toBe(1)
    expect((await app(new Request('http://localhost/api/books/browse?genre=nope'))).status).toBe(400)
    expect((await app(new Request('http://localhost/api/books/browse?sort=nope'))).status).toBe(400)
    const sorted = (await (await app(new Request('http://localhost/api/books/browse?sort=title&q=du'))).json()) as { books: { title: string }[] }
    expect(sorted.books.map((book) => book.title)).toEqual(['Dune'])
  })

  it('stores nothing for a visitor without an account', async () => {
    const { app, db } = await makeApp()
    await app(new Request('http://localhost/api/books/search?q=dune'))
    await app(new Request('http://localhost/api/books/popular'))
    await app(new Request('http://localhost/api/auth/me'))
    for (const table of ['users', 'sessions', 'profiles', 'ratings', 'wishlist', 'chat_messages', 'book_of_day']) {
      expect(await db.get(`select count(*) as c from ${table}`), table).toEqual({ c: 0 })
    }
  })

  it('reports not registered without a session and rejects an unknown token', async () => {
    const { app } = await makeApp()
    expect(await (await app(new Request('http://localhost/api/auth/me'))).json()).toEqual({ registered: false, username: null })
    expect(await (await call(app, 'folio_session=bad', 'GET', '/api/auth/me')).json()).toEqual({ registered: false, username: null })
    expect((await call(app, 'folio_session=bad', 'GET', '/api/ratings')).status).toBe(401)
  })
})

describe('library endpoints', () => {
  it('stores ratings and wishlist per user and validates input', async () => {
    const { app, dune } = await makeApp()
    const cookie = await login(app)
    expect((await call(app, cookie, 'PUT', `/api/ratings/${dune}`, { value: 1, isRead: true })).status).toBe(204)
    expect(await (await call(app, cookie, 'GET', '/api/ratings')).json()).toEqual({ ratings: { [dune]: 1 } })
    expect((await call(app, cookie, 'PUT', `/api/ratings/${dune}`, { value: 5 })).status).toBe(400)
    expect((await call(app, cookie, 'PUT', '/api/ratings/missing', { value: 1 })).status).toBe(404)

    expect((await call(app, cookie, 'PUT', `/api/wishlist/${dune}`)).status).toBe(204)
    expect(await (await call(app, cookie, 'GET', '/api/wishlist')).json()).toEqual({
      bookIds: [dune],
      books: [{ bookId: dune, title: 'Dune', authors: ['Author'], genres: ['science_fiction'], minAge: 0 }],
    })
    expect((await call(app, cookie, 'DELETE', `/api/wishlist/${dune}`)).status).toBe(204)
    expect(await (await call(app, cookie, 'GET', '/api/wishlist')).json()).toEqual({ bookIds: [], books: [] })

    const other = await login(app)
    expect(await (await call(app, other, 'GET', '/api/ratings')).json()).toEqual({ ratings: {} })
  })

  it('saves the profile and updates privacy flags', async () => {
    const { app } = await makeApp()
    const cookie = await login(app)
    expect(await (await call(app, cookie, 'GET', '/api/profile')).json()).toEqual({ profile: null })
    expect((await call(app, cookie, 'PATCH', '/api/profile', { personalizationEnabled: false })).status).toBe(404)
    expect((await call(app, cookie, 'PUT', '/api/profile', { interests: ['nonsense'], consent: true })).status).toBe(400)
    expect((await call(app, cookie, 'PUT', '/api/profile', { interests: ['fantasy'], consent: true })).status).toBe(204)
    expect((await call(app, cookie, 'PATCH', '/api/profile', { aiDescriptionsEnabled: false })).status).toBe(204)
    expect(await (await call(app, cookie, 'GET', '/api/profile')).json()).toEqual({
      profile: { interests: ['fantasy'], personalizationEnabled: true, aiDescriptionsEnabled: false, maxAge: null },
    })
  })

  it('searches and lists popular books', async () => {
    const { app } = await makeApp()
    const cookie = await login(app)
    const found = (await (await call(app, cookie, 'GET', '/api/books/search?q=austen')).json()) as { title: string }[]
    expect(found.map((book) => book.title)).toEqual(['Emma'])
    const popular = (await (await call(app, cookie, 'GET', '/api/books/popular?interests=science_fiction')).json()) as { title: string }[]
    expect(popular.map((book) => book.title)).toEqual(['Dune'])
  })
})

describe('age filter', () => {
  async function seeded() {
    const made = await makeApp()
    await made.db.run("update books set min_age = 16 where title = 'Dune'")
    return made
  }

  it('hides books above the limit from search, popular and browse for a visitor who sends the header', async () => {
    const { app } = await seeded()
    const get = async (path: string, age?: string) =>
      (await (await app(new Request(`http://localhost${path}`, { headers: age ? { 'x-max-age': age } : {} }))).json()) as { title: string }[]
    expect((await get('/api/books/search?q=dune')).map((book) => book.title)).toEqual(['Dune'])
    expect(await get('/api/books/search?q=dune', '12')).toEqual([])
    expect((await get('/api/books/search?q=dune', '16')).map((book) => book.title)).toEqual(['Dune'])
    expect((await get('/api/books/popular?interests=science_fiction', '12')).map((book) => book.title)).toEqual([])
    const browse = (await (await app(new Request('http://localhost/api/books/browse?limit=40', { headers: { 'x-max-age': '12' } }))).json()) as { books: { title: string }[] }
    expect(browse.books.map((book) => book.title)).not.toContain('Dune')
    const all = (await (await app(new Request('http://localhost/api/books/browse?limit=40'))).json()) as { books: { title: string }[] }
    expect(all.books.map((book) => book.title)).toContain('Dune')
  })

  it('ignores an invalid header value', async () => {
    const { app } = await seeded()
    const found = (await (await app(new Request('http://localhost/api/books/search?q=dune', { headers: { 'x-max-age': 'abc' } }))).json()) as unknown[]
    expect(found).toHaveLength(1)
  })

  it('uses the limit saved in the profile of a signed in user and keeps it out of recommendations', async () => {
    const { app } = await seeded()
    const cookie = await login(app)
    await call(app, cookie, 'PUT', '/api/profile', { interests: ['science_fiction'], consent: true })
    const before = (await (await call(app, cookie, 'GET', '/api/recommendations')).json()) as { title: string }[]
    expect(before.map((book) => book.title)).toContain('Dune')
    expect((await call(app, cookie, 'PATCH', '/api/profile', { maxAge: 12 })).status).toBe(204)
    expect(((await (await call(app, cookie, 'GET', '/api/profile')).json()) as { profile: { maxAge: number } }).profile.maxAge).toBe(12)
    const after = (await (await call(app, cookie, 'GET', '/api/recommendations')).json()) as { title: string }[]
    expect(after.map((book) => book.title)).not.toContain('Dune')
    const found = (await (await call(app, cookie, 'GET', '/api/books/search?q=dune')).json()) as unknown[]
    expect(found).toEqual([])
    expect((await call(app, cookie, 'PATCH', '/api/profile', { maxAge: null })).status).toBe(204)
    expect(((await (await call(app, cookie, 'GET', '/api/books/search?q=dune')).json()) as unknown[]).length).toBe(1)
    expect((await call(app, cookie, 'PATCH', '/api/profile', { maxAge: 10 })).status).toBe(400)
  })

  it('does not return a hidden book as the book of the day', async () => {
    const { app } = await seeded()
    const cookie = await login(app)
    await call(app, cookie, 'PUT', '/api/profile', { interests: [], consent: true })
    await call(app, cookie, 'PATCH', '/api/profile', { maxAge: 12 })
    const day = (await (await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-12')).json()) as { book: { title: string; minAge: number } }
    expect(day.book.title).not.toBe('Dune')
  })
})

describe('account settings', () => {
  async function loginAs(app: App, username: string, userAgent = 'TestBrowser/1.0'): Promise<string> {
    const response = await app(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': userAgent },
        body: JSON.stringify({ username, password: 'secret password' }),
      }),
    )
    expect(response.status).toBe(200)
    return (response.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
  }

  it('returns the username and creation date of the account', async () => {
    const { app } = await makeApp()
    const cookie = await login(app)
    const account = (await (await call(app, cookie, 'GET', '/api/auth/account')).json()) as { username: string; createdAt: string }
    expect(account.username).toMatch(/^reader\d+$/)
    expect(Number.isNaN(Date.parse(account.createdAt))).toBe(false)
    expect((await app(new Request('http://localhost/api/auth/account'))).status).toBe(401)
  })

  it('reports the current terms version and records a new acceptance', async () => {
    const { app, db } = await makeApp()
    const cookie = await login(app)
    await db.run("update users set terms_version = '2020-01-01', terms_accepted_at = '2020-01-01T00:00:00.000Z'")
    const before = (await (await call(app, cookie, 'GET', '/api/auth/account')).json()) as { termsVersion: string; currentTermsVersion: string }
    expect(before.termsVersion).toBe('2020-01-01')
    expect(before.currentTermsVersion).toBe(TERMS_VERSION)
    expect((await call(app, cookie, 'POST', '/api/auth/terms', { acceptTerms: false })).status).toBe(400)
    expect((await call(app, cookie, 'POST', '/api/auth/terms', {})).status).toBe(400)
    expect((await call(app, cookie, 'POST', '/api/auth/terms', { acceptTerms: true })).status).toBe(200)
    const after = (await (await call(app, cookie, 'GET', '/api/auth/account')).json()) as { termsVersion: string; termsAcceptedAt: string }
    expect(after.termsVersion).toBe(TERMS_VERSION)
    expect(after.termsAcceptedAt).not.toBe('2020-01-01T00:00:00.000Z')
    expect((await app(new Request('http://localhost/api/auth/terms', { method: 'POST', body: JSON.stringify({ acceptTerms: true }) }))).status).toBe(401)
  })

  it('changes the username after a password check and keeps the session', async () => {
    const { app } = await makeApp()
    const cookie = await login(app)
    expect((await call(app, cookie, 'POST', '/api/auth/username', { username: 'new.name', password: 'wrong password' })).status).toBe(401)
    const ok = await call(app, cookie, 'POST', '/api/auth/username', { username: ' New.Name ', password: 'secret password' })
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ username: 'new.name' })
    expect(await (await call(app, cookie, 'GET', '/api/auth/me')).json()).toEqual({ registered: true, username: 'new.name' })
    expect(await loginAs(app, 'new.name')).toContain('folio_session')
  })

  it('rejects a taken or invalid username', async () => {
    const { app } = await makeApp()
    const first = await login(app)
    const second = await login(app)
    const taken = (await (await call(app, first, 'GET', '/api/auth/account')).json()) as { username: string }
    const response = await call(app, second, 'POST', '/api/auth/username', { username: taken.username, password: 'secret password' })
    expect(response.status).toBe(409)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('username_taken')
    expect((await call(app, second, 'POST', '/api/auth/username', { username: 'a b', password: 'secret password' })).status).toBe(400)
  })

  it('lists sessions with the current one marked and revokes another one', async () => {
    const { app } = await makeApp()
    const first = await login(app)
    const account = (await (await call(app, first, 'GET', '/api/auth/account')).json()) as { username: string }
    const second = await loginAs(app, account.username, 'Other/2.0')
    const list = (await (await call(app, first, 'GET', '/api/auth/sessions')).json()) as {
      sessions: { id: string; current: boolean; userAgent: string; lastSeenAt: string }[]
    }
    expect(list.sessions).toHaveLength(2)
    expect(list.sessions.filter((session) => session.current)).toHaveLength(1)
    const other = list.sessions.find((session) => !session.current)
    expect(other?.userAgent).toBe('Other/2.0')
    expect(JSON.stringify(list)).not.toContain(first.split('=')[1] ?? 'x')
    const current = list.sessions.find((session) => session.current)
    expect((await call(app, first, 'DELETE', `/api/auth/sessions/${current?.id}`)).status).toBe(400)
    expect((await call(app, first, 'DELETE', `/api/auth/sessions/${other?.id}`)).status).toBe(204)
    expect((await call(app, second, 'GET', '/api/auth/me')).status).toBe(200)
    expect(await (await call(app, second, 'GET', '/api/auth/me')).json()).toEqual({ registered: false, username: null })
    expect((await call(app, first, 'DELETE', `/api/auth/sessions/${other?.id}`)).status).toBe(404)
    expect((await call(app, first, 'DELETE', '/api/auth/sessions/not-an-id')).status).toBe(404)
  })

  it("does not let a user revoke another user's session", async () => {
    const { app } = await makeApp()
    const alice = await login(app)
    const bob = await login(app)
    const bobSessions = (await (await call(app, bob, 'GET', '/api/auth/sessions')).json()) as { sessions: { id: string }[] }
    expect((await call(app, alice, 'DELETE', `/api/auth/sessions/${bobSessions.sessions[0]?.id}`)).status).toBe(404)
    expect((await call(app, bob, 'GET', '/api/auth/me')).status).toBe(200)
  })
})

describe('rated books list', () => {
  it('returns the rated books with their ratings, newest first, and keeps users apart', async () => {
    const { app, dune, emma } = await makeApp()
    const cookie = await login(app)
    const other = await login(app)
    await call(app, cookie, 'PUT', `/api/ratings/${dune}`, { value: 1 })
    await call(app, cookie, 'PUT', `/api/ratings/${emma}`, { value: -1, isRead: true })
    const data = (await (await call(app, cookie, 'GET', '/api/ratings/books')).json()) as {
      items: { book: { title: string }; value: number; isRead: boolean }[]
    }
    expect(data.items.map((item) => [item.book.title, item.value, item.isRead]).sort()).toEqual([
      ['Dune', 1, false],
      ['Emma', -1, true],
    ])
    expect(((await (await call(app, other, 'GET', '/api/ratings/books')).json()) as { items: unknown[] }).items).toEqual([])
    expect((await app(new Request('http://localhost/api/ratings/books'))).status).toBe(401)
  })
})

describe('book details', () => {
  it('returns the facts of a book and rejects an unknown theme filter', async () => {
    const { app, db, dune } = await makeApp()
    await db.run("update books set themes = '[\"power\",\"religion\"]', difficulty = 'hard', length = 'epic', first_publish_year = 1965 where id = ?", dune)
    const book = (await (await app(new Request(`http://localhost/api/books/${dune}`))).json()) as Record<string, unknown>
    expect(book).toMatchObject({ title: 'Dune', year: 1965, themes: ['power', 'religion'], difficulty: 'hard', length: 'epic', originalLanguage: 'en' })
    const filtered = (await (await app(new Request('http://localhost/api/books/browse?theme=power'))).json()) as { books: { title: string }[] }
    expect(filtered.books.map((item) => item.title)).toEqual(['Dune'])
    expect((await app(new Request('http://localhost/api/books/browse?theme=nonsense'))).status).toBe(400)
  })

  it('lists similar books and validates the id', async () => {
    const { app, db, dune, emma } = await makeApp()
    await db.run("update books set themes = '[\"power\"]' where id in (?, ?)", dune, emma)
    await db.run("update books set genres = '[\"classics\"]' where id = ?", dune)
    const similar = (await (await app(new Request(`http://localhost/api/books/${dune}/similar`))).json()) as { title: string }[]
    expect(similar.map((book) => book.title)).toEqual(['Emma'])
    expect((await app(new Request('http://localhost/api/books/not-an-id/similar'))).status).toBe(400)
  })
})

describe('shelf', () => {
  it('keeps one status per book across want, reading and read', async () => {
    const { app, dune, emma } = await makeApp()
    const cookie = await login(app)
    expect((await call(app, cookie, 'PUT', `/api/shelf/${dune}`, { status: 'want' })).status).toBe(204)
    expect((await call(app, cookie, 'PUT', `/api/shelf/${emma}`, { status: 'reading' })).status).toBe(204)
    let items = ((await (await call(app, cookie, 'GET', '/api/shelf')).json()) as { items: { book: { title: string }; status: string }[] }).items
    expect(items.map((item) => [item.book.title, item.status]).sort()).toEqual([
      ['Dune', 'want'],
      ['Emma', 'reading'],
    ])
    expect((await call(app, cookie, 'PUT', `/api/shelf/${dune}`, { status: 'read' })).status).toBe(204)
    items = ((await (await call(app, cookie, 'GET', '/api/shelf')).json()) as { items: { book: { title: string }; status: string }[] }).items
    expect(items.filter((item) => item.book.title === 'Dune')).toHaveLength(1)
    expect(items.find((item) => item.book.title === 'Dune')?.status).toBe('read')
    expect(await (await call(app, cookie, 'GET', '/api/wishlist')).json()).toEqual({ bookIds: [], books: [] })
    expect((await call(app, cookie, 'PUT', `/api/wishlist/${dune}`)).status).toBe(204)
    items = ((await (await call(app, cookie, 'GET', '/api/shelf')).json()) as { items: { book: { title: string }; status: string }[] }).items
    expect(items.find((item) => item.book.title === 'Dune')?.status).toBe('want')
    expect((await call(app, cookie, 'DELETE', `/api/shelf/${dune}`)).status).toBe(204)
    items = ((await (await call(app, cookie, 'GET', '/api/shelf')).json()) as { items: { book: { title: string }; status: string }[] }).items
    expect(items.map((item) => item.book.title)).toEqual(['Emma'])
  })

  it('validates the status and the book, requires a session and keeps users apart', async () => {
    const { app, dune } = await makeApp()
    const first = await login(app)
    const second = await login(app)
    expect((await call(app, first, 'PUT', `/api/shelf/${dune}`, { status: 'finished' })).status).toBe(400)
    expect((await call(app, first, 'PUT', '/api/shelf/00000000-0000-4000-8000-000000000000', { status: 'read' })).status).toBe(404)
    await call(app, first, 'PUT', `/api/shelf/${dune}`, { status: 'read' })
    expect(((await (await call(app, second, 'GET', '/api/shelf')).json()) as { items: unknown[] }).items).toEqual([])
    expect((await app(new Request('http://localhost/api/shelf'))).status).toBe(401)
  })

  it('includes the shelf in the data export', async () => {
    const { app, dune } = await makeApp()
    const cookie = await login(app)
    await call(app, cookie, 'PUT', `/api/shelf/${dune}`, { status: 'reading' })
    const data = (await (await call(app, cookie, 'GET', '/api/me/export')).json()) as { shelf: { title: string; status: string }[] }
    expect(data.shelf).toMatchObject([{ title: 'Dune', status: 'reading' }])
  })
})

describe('recommendations and book of the day', () => {
  it('recommends popular books at cold start with scores between 0 and 1', async () => {
    const { app } = await makeApp()
    const cookie = await login(app)
    await call(app, cookie, 'PUT', '/api/profile', { interests: ['science_fiction'], consent: true })
    const items = (await (await call(app, cookie, 'GET', '/api/recommendations')).json()) as { title: string; score: number; rank: number; mode: string }[]
    expect(items[0]).toMatchObject({ title: 'Dune', rank: 1, mode: 'popular' })
    for (const item of items) {
      expect(item.score).toBeGreaterThanOrEqual(0)
      expect(item.score).toBeLessThanOrEqual(1)
    }
  })

  it('explains a recommendation with reasons that sum to 100', async () => {
    const { app, dune } = await makeApp()
    const cookie = await login(app)
    await call(app, cookie, 'PUT', '/api/profile', { interests: ['science_fiction'], consent: true })
    const body = (await (await call(app, cookie, 'GET', `/api/books/${dune}/explain`)).json()) as {
      mode: string
      reasons: { percent: number }[]
      description: { text: string; aiGenerated: boolean }
    }
    expect(body.mode).toBe('popular')
    expect(body.reasons.reduce((sum, reason) => sum + reason.percent, 0)).toBe(100)
    expect(body.description).toEqual({ text: 'Catalog dune.', aiGenerated: false })
  })

  it('creates the book of the day once and returns the same one on repeat', async () => {
    const { app } = await makeApp({ ai: true })
    const cookie = await login(app)
    const first = await (await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-12')).json()
    const second = await (await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-12')).json()
    expect(second).toEqual(first)
    expect(first).toMatchObject({ description: 'Generated blurb.', aiGenerated: true })
  })

  it('uses the catalog description when AI is not configured and rejects far dates', async () => {
    const { app } = await makeApp()
    const cookie = await login(app)
    const body = (await (await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-12')).json()) as { book: { bookId: string } }
    const catalog = (await (await app(new Request(`http://localhost/api/books/${body.book.bookId}`))).json()) as { description: string | null }
    expect(body).toMatchObject({ description: catalog.description, aiGenerated: false })
    expect((await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-20')).status).toBe(400)
  })
})

describe('books without embeddings', () => {
  it('keeps recommending by popularity after a rating when no vectors exist', async () => {
    const db = await openDatabase(':memory:')
    const first = await insertBook(db, { title: 'First', popularity: 5 })
    await insertBook(db, { title: 'Second', popularity: 4 })
    const app = createApp(
      { db, llm: null, embed: null, now: () => new Date('2026-11-12T10:00:00Z'), throttle: createThrottle(() => new Date('2026-11-12T10:00:00Z')) },
      webRoot,
    )
    const cookie = await login(app)
    await call(app, cookie, 'PUT', `/api/ratings/${first}`, { value: 1 })
    const items = (await (await call(app, cookie, 'GET', '/api/recommendations')).json()) as { title: string }[]
    expect(items.map((item) => item.title)).toEqual(['Second'])
    expect((await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-12')).status).toBe(200)
  })
})

describe('chat endpoint', () => {
  it('answers 503 when AI is not configured', async () => {
    const { app } = await makeApp()
    const cookie = await login(app)
    const response = await call(app, cookie, 'POST', '/api/chat', { message: 'hi' })
    expect(response.status).toBe(503)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('ai_unavailable')
  })

  it('streams SSE events and enforces the body schema', async () => {
    const { app } = await makeApp({ ai: true })
    const cookie = await login(app)
    expect((await call(app, cookie, 'POST', '/api/chat', { message: '' })).status).toBe(400)
    const response = await call(app, cookie, 'POST', '/api/chat', { message: 'something light' })
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    const text = await response.text()
    expect(text).toContain('event: books')
    expect(text).toContain('event: token\ndata: {"text":"Hello"}')
    expect(text.trim().endsWith('event: done\ndata: {}')).toBe(true)
  })

  it('limits the user to 20 messages per hour', async () => {
    const { app } = await makeApp({ ai: true })
    const cookie = await login(app)
    for (let i = 0; i < 20; i++) {
      expect((await (await call(app, cookie, 'POST', '/api/chat', { message: `q${i}` })).text()).length).toBeGreaterThan(0)
    }
    expect((await call(app, cookie, 'POST', '/api/chat', { message: 'one more' })).status).toBe(429)
  })
})

describe('chat history', () => {
  it('returns the stored exchanges in order with the books of the answers and clears them', async () => {
    const { app, db, dune } = await makeApp({ ai: true })
    const cookie = await login(app)
    await db.run('update books set min_age = 0')
    const user = (await db.get("select id from users limit 1") as { id: string }).id
    await db.run("insert into chat_messages (id, user_id, role, content, book_ids, created_at) values ('m1', ?, 'user', 'Что почитать?', '[]', '2026-11-12T09:00:00.000Z')", user)
    await db.run("insert into chat_messages (id, user_id, role, content, book_ids, created_at) values ('m2', ?, 'assistant', 'Вот книга.', ?, '2026-11-12T09:00:00.001Z')", user, JSON.stringify([dune]))
    const history = (await (await call(app, cookie, 'GET', '/api/chat/history')).json()) as {
      messages: { id: string; role: string; text: string; books: { title: string }[] }[]
    }
    expect(history.messages.map((message) => message.id)).toEqual(['m1', 'm2'])
    expect(history.messages[1]?.books.map((book) => book.title)).toEqual(['Dune'])
    expect(history.messages[0]?.books).toEqual([])
    expect((await call(app, cookie, 'DELETE', '/api/chat/history')).status).toBe(204)
    expect(((await (await call(app, cookie, 'GET', '/api/chat/history')).json()) as { messages: unknown[] }).messages).toEqual([])
  })

  it('does not show another user\'s messages and requires a session', async () => {
    const { app, db } = await makeApp({ ai: true })
    const first = await login(app)
    const second = await login(app)
    const owner = (await db.get('select id from users order by created_at limit 1') as { id: string }).id
    await db.run("insert into chat_messages (id, user_id, role, content, book_ids, created_at) values ('x1', ?, 'user', 'private', '[]', '2026-11-12T09:00:00.000Z')", owner)
    const own = (await (await call(app, first, 'GET', '/api/chat/history')).json()) as { messages: unknown[] }
    const other = (await (await call(app, second, 'GET', '/api/chat/history')).json()) as { messages: unknown[] }
    expect(own.messages.length + other.messages.length).toBe(1)
    expect((await app(new Request('http://localhost/api/chat/history'))).status).toBe(401)
  })

  it('hides books above the age limit from the history cards', async () => {
    const { app, db, dune } = await makeApp({ ai: true })
    const cookie = await login(app)
    await call(app, cookie, 'PUT', '/api/profile', { interests: [], consent: true })
    await call(app, cookie, 'PATCH', '/api/profile', { maxAge: 12 })
    await db.run("update books set min_age = 16 where id = ?", dune)
    const user = (await db.get('select id from users limit 1') as { id: string }).id
    await db.run("insert into chat_messages (id, user_id, role, content, book_ids, created_at) values ('a1', ?, 'assistant', 'x', ?, '2026-11-12T09:00:00.000Z')", user, JSON.stringify([dune]))
    const history = (await (await call(app, cookie, 'GET', '/api/chat/history')).json()) as { messages: { books: unknown[] }[] }
    expect(history.messages[0]?.books).toEqual([])
  })
})

describe('account deletion endpoint', () => {
  it('requires the password, then removes the user, clears the cookie and invalidates the session', async () => {
    const { app, dune, db } = await makeApp()
    const cookie = await login(app)
    await call(app, cookie, 'PUT', `/api/ratings/${dune}`, { value: 1 })
    expect((await call(app, cookie, 'DELETE', '/api/me')).status).toBe(400)
    expect((await call(app, cookie, 'DELETE', '/api/me', { password: 'wrong password' })).status).toBe(401)
    expect(await db.get('select count(*) as c from users')).toEqual({ c: 1 })

    const response = await call(app, cookie, 'DELETE', '/api/me', { password: 'secret password' })
    expect(response.status).toBe(204)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(await db.get('select count(*) as c from ratings')).toEqual({ c: 0 })
    expect(await db.get('select count(*) as c from users')).toEqual({ c: 0 })
    expect(await db.get('select count(*) as c from sessions')).toEqual({ c: 0 })
    expect((await call(app, cookie, 'GET', '/api/ratings')).status).toBe(401)
  })

  it('does not allow deleting without a session', async () => {
    const { app } = await makeApp()
    expect((await app(new Request('http://localhost/api/me', { method: 'DELETE', body: JSON.stringify({ password: 'x' }) }))).status).toBe(401)
  })
})

describe('auth endpoints', () => {
  const credentials = { username: 'Reader', password: 'secret password', acceptTerms: true }

  async function register(app: App): Promise<{ cookie: string; recoveryCode: string }> {
    const response = await app(
      new Request('http://localhost/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { username: string; recoveryCode: string }
    expect(body.username).toBe('reader')
    return { cookie: (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '', recoveryCode: body.recoveryCode }
  }

  async function signIn(app: App, password: string): Promise<Response> {
    return app(
      new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'reader', password }) }),
    )
  }

  it('registers an account in one step and returns a one-time recovery code', async () => {
    const { app } = await makeApp()
    const { cookie, recoveryCode } = await register(app)
    expect(recoveryCode).toMatch(/^([0-9A-F]{4}-){4}[0-9A-F]{4}$/)
    expect(await (await call(app, cookie, 'GET', '/api/auth/me')).json()).toEqual({ registered: true, username: 'reader' })
  })

  it('rejects a taken username and invalid credentials', async () => {
    const { app } = await makeApp()
    await register(app)
    const taken = await app(new Request('http://localhost/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) }))
    expect(taken.status).toBe(409)
    expect(((await taken.json()) as { error: { code: string } }).error.code).toBe('username_taken')
    const bad = (body: unknown) => app(new Request('http://localhost/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
    expect((await bad({ username: 'a', password: 'secret password', acceptTerms: true })).status).toBe(400)
    expect((await bad({ username: 'fresh', password: 'short', acceptTerms: true })).status).toBe(400)
  })

  it('requires the terms to be accepted and records the version and time', async () => {
    const { app, db } = await makeApp()
    const post = (body: unknown) => app(new Request('http://localhost/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
    expect((await post({ username: 'newbie', password: 'secret password' })).status).toBe(400)
    expect((await post({ username: 'newbie', password: 'secret password', acceptTerms: false })).status).toBe(400)
    expect(await db.get("select count(*) as c from users where username = 'newbie'")).toEqual({ c: 0 })
    const ok = await post({ username: 'newbie', password: 'secret password', acceptTerms: true })
    expect(ok.status).toBe(200)
    const cookie = (ok.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    const account = (await (await call(app, cookie, 'GET', '/api/auth/account')).json()) as { termsVersion: string; termsAcceptedAt: string }
    expect(account.termsVersion).toBe(TERMS_VERSION)
    expect(Number.isNaN(Date.parse(account.termsAcceptedAt))).toBe(false)
  })

  it('logs in from another browser and sees the same data', async () => {
    const { app, dune } = await makeApp()
    const first = await register(app)
    await call(app, first.cookie, 'PUT', `/api/ratings/${dune}`, { value: 1 })
    const response = await signIn(app, 'secret password')
    expect(response.status).toBe(200)
    const second = (response.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    expect(second).not.toBe(first.cookie)
    expect(await (await call(app, second, 'GET', '/api/ratings')).json()).toEqual({ ratings: { [dune]: 1 } })
    expect((await call(app, first.cookie, 'GET', '/api/ratings')).status).toBe(200)
  })

  it('rejects a wrong password and throttles after repeated failures', async () => {
    const { app } = await makeApp()
    await register(app)
    const wrong = await signIn(app, 'wrong password')
    expect(wrong.status).toBe(401)
    expect(((await wrong.json()) as { error: { code: string } }).error.code).toBe('invalid_credentials')
    for (let i = 0; i < 5; i++) {
      await signIn(app, 'wrong password')
    }
    expect((await signIn(app, 'secret password')).status).toBe(429)
  })

  it('logs out the current session only, and everywhere on request', async () => {
    const { app } = await makeApp()
    const first = await register(app)
    const second = ((await signIn(app, 'secret password')).headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    const logout = await call(app, first.cookie, 'POST', '/api/auth/logout')
    expect(logout.status).toBe(204)
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')
    expect((await call(app, first.cookie, 'GET', '/api/ratings')).status).toBe(401)
    expect((await call(app, second, 'GET', '/api/ratings')).status).toBe(200)

    const everywhere = await call(app, second, 'POST', '/api/auth/logout-all')
    expect(everywhere.status).toBe(204)
    expect((await call(app, second, 'GET', '/api/ratings')).status).toBe(401)
    expect((await signIn(app, 'secret password')).status).toBe(200)
  })

  it('logging out without a session is harmless and logout-all needs a session', async () => {
    const { app } = await makeApp()
    expect((await app(new Request('http://localhost/api/auth/logout', { method: 'POST' }))).status).toBe(204)
    expect((await app(new Request('http://localhost/api/auth/logout-all', { method: 'POST' }))).status).toBe(401)
  })

  it('changes the password, closing other sessions but keeping the current one', async () => {
    const { app } = await makeApp()
    const first = await register(app)
    const second = ((await signIn(app, 'secret password')).headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    expect((await call(app, second, 'POST', '/api/auth/password', { currentPassword: 'nope nope', newPassword: 'new password 1' })).status).toBe(401)
    expect((await call(app, second, 'POST', '/api/auth/password', { currentPassword: 'secret password', newPassword: 'new password 1' })).status).toBe(204)
    expect((await call(app, second, 'GET', '/api/ratings')).status).toBe(200)
    expect((await call(app, first.cookie, 'GET', '/api/ratings')).status).toBe(401)
    expect((await signIn(app, 'secret password')).status).toBe(401)
    expect((await signIn(app, 'new password 1')).status).toBe(200)
  })

  it('issues a new recovery code after confirming the password', async () => {
    const { app } = await makeApp()
    const { cookie, recoveryCode } = await register(app)
    expect((await call(app, cookie, 'POST', '/api/auth/recovery-code', { password: 'wrong password' })).status).toBe(401)
    const response = await call(app, cookie, 'POST', '/api/auth/recovery-code', { password: 'secret password' })
    const body = (await response.json()) as { recoveryCode: string }
    expect(body.recoveryCode).not.toBe(recoveryCode)
    const old = await app(
      new Request('http://localhost/api/auth/recover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'reader', recoveryCode, newPassword: 'fresh password 1' }),
      }),
    )
    expect(old.status).toBe(401)
  })

  it('recovers the account with the recovery code, closes all sessions and issues a new code', async () => {
    const { app, dune } = await makeApp()
    const first = await register(app)
    await call(app, first.cookie, 'PUT', `/api/ratings/${dune}`, { value: 1 })
    const recoverWith = (recoveryCode: string) =>
      app(
        new Request('http://localhost/api/auth/recover', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: 'reader', recoveryCode, newPassword: 'fresh password 1' }),
        }),
      )
    expect((await recoverWith('0000-0000-0000-0000-0000')).status).toBe(401)
    const recovered = await recoverWith(first.recoveryCode)
    expect(recovered.status).toBe(200)
    const body = (await recovered.json()) as { recoveryCode: string }
    expect(body.recoveryCode).not.toBe(first.recoveryCode)
    const cookie = (recovered.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    expect(await (await call(app, cookie, 'GET', '/api/ratings')).json()).toEqual({ ratings: { [dune]: 1 } })
    expect((await call(app, first.cookie, 'GET', '/api/ratings')).status).toBe(401)
  })
})

describe('data export', () => {
  it('exports the data of the signed in user only', async () => {
    const { app, dune } = await makeApp()
    const cookie = await login(app)
    await call(app, cookie, 'PUT', '/api/profile', { interests: ['fantasy'], consent: true })
    await call(app, cookie, 'PUT', `/api/ratings/${dune}`, { value: 1, isRead: true })
    await call(app, cookie, 'PUT', `/api/wishlist/${dune}`)
    const other = await login(app)
    await call(app, other, 'PUT', `/api/ratings/${dune}`, { value: -1 })

    const data = (await (await call(app, cookie, 'GET', '/api/me/export')).json()) as {
      account: { username: string }
      profile: { interests: string[] }
      ratings: { title: string; value: number }[]
      wishlist: { title: string }[]
    }
    expect(data.account.username).toMatch(/^reader\d+$/)
    expect(data.profile.interests).toEqual(['fantasy'])
    expect(data.ratings).toMatchObject([{ title: 'Dune', value: 1 }])
    expect(data.wishlist).toMatchObject([{ title: 'Dune' }])
    expect(JSON.stringify(data)).not.toContain('password')
    expect(JSON.stringify(data)).not.toContain('recovery')
  })
})

describe('capabilities endpoint', () => {
  it('reports whether AI features are configured', async () => {
    expect(await (await (await makeApp()).app(new Request('http://localhost/api/capabilities'))).json()).toEqual({ ai: false })
    expect(await (await (await makeApp({ ai: true })).app(new Request('http://localhost/api/capabilities'))).json()).toEqual({ ai: true })
  })
})

describe('static files', () => {
  it('serves files, falls back to index.html for routes and 404s for missing files', async () => {
    const { app } = await makeApp()
    const index = await app(new Request('http://localhost/profile'))
    expect(await index.text()).toBe('<html>app</html>')
    const script = await app(new Request('http://localhost/main.js'))
    expect(script.headers.get('content-type')).toContain('javascript')
    expect((await app(new Request('http://localhost/missing.js'))).status).toBe(404)
  })

  it('does not serve files outside the web root', async () => {
    const { app } = await makeApp()
    const response = await app(new Request('http://localhost/..%2F..%2Fetc%2Fpasswd.txt'))
    expect(response.status).toBe(404)
  })

  it('returns 404 for unknown API paths', async () => {
    const { app } = await makeApp()
    expect((await app(new Request('http://localhost/api/unknown'))).status).toBe(404)
  })
})
