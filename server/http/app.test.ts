import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createThrottle } from '../auth/throttle.ts'
import { openDatabase } from '../db/database.ts'
import { insertBook } from '../db/test-fixtures.ts'
import type { Llm } from '../shared/llm.ts'
import { createApp } from './app.ts'

let webRoot = ''

beforeAll(() => {
  webRoot = mkdtempSync(join(tmpdir(), 'folio-web-'))
  writeFileSync(join(webRoot, 'index.html'), '<html>app</html>')
  writeFileSync(join(webRoot, 'main.js'), 'console.log(1)')
})

afterAll(() => {
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

function makeApp(options: { ai?: boolean } = {}) {
  const db = openDatabase(':memory:')
  const dune = insertBook(db, { title: 'Dune', genres: ['science_fiction'], popularity: 50, description: 'Catalog dune.', embedding: [1, 0] })
  const emma = insertBook(db, { title: 'Emma', authors: ['Jane Austen'], genres: ['classics'], popularity: 10, embedding: [0, 1] })
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

type App = ReturnType<typeof makeApp>['app']

let accountCounter = 0

async function login(app: App): Promise<string> {
  accountCounter++
  const response = await app(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: `reader${accountCounter}`, password: 'secret password' }),
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
    const { app } = makeApp()
    for (const path of ['/api/recommendations', '/api/ratings', '/api/wishlist', '/api/profile', '/api/taste', '/api/me/export']) {
      const response = await app(new Request(`http://localhost${path}`))
      expect(response.status, path).toBe(401)
      expect(await response.json()).toEqual({ error: { code: 'unauthorized', message: 'Missing or invalid session' } })
    }
    expect((await app(new Request('http://localhost/api/chat', { method: 'POST', body: '{}' }))).status).toBe(401)
  })

  it('serves search, popular books, book details and capabilities without a session and sets no cookie', async () => {
    const { app, dune } = makeApp()
    const search = await app(new Request('http://localhost/api/books/search?q=dune'))
    expect(search.status).toBe(200)
    expect(search.headers.get('set-cookie')).toBeNull()
    expect(((await search.json()) as { title: string }[]).map((book) => book.title)).toEqual(['Dune'])
    const popular = (await (await app(new Request('http://localhost/api/books/popular?interests=science_fiction'))).json()) as { title: string }[]
    expect(popular.map((book) => book.title)).toEqual(['Dune'])
    expect(await (await app(new Request(`http://localhost/api/books/${dune}`))).json()).toMatchObject({ title: 'Dune', description: 'Catalog dune.' })
    expect((await app(new Request('http://localhost/api/capabilities'))).status).toBe(200)
  })

  it('browses books by genre with a total and rejects an unknown genre', async () => {
    const { app } = makeApp()
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
  })

  it('stores nothing for a visitor without an account', async () => {
    const { app, db } = makeApp()
    await app(new Request('http://localhost/api/books/search?q=dune'))
    await app(new Request('http://localhost/api/books/popular'))
    await app(new Request('http://localhost/api/auth/me'))
    for (const table of ['users', 'sessions', 'profiles', 'ratings', 'wishlist', 'chat_messages', 'book_of_day']) {
      expect(db.prepare(`select count(*) as c from ${table}`).get(), table).toEqual({ c: 0 })
    }
  })

  it('reports not registered without a session and rejects an unknown token', async () => {
    const { app } = makeApp()
    expect(await (await app(new Request('http://localhost/api/auth/me'))).json()).toEqual({ registered: false, username: null })
    expect(await (await call(app, 'folio_session=bad', 'GET', '/api/auth/me')).json()).toEqual({ registered: false, username: null })
    expect((await call(app, 'folio_session=bad', 'GET', '/api/ratings')).status).toBe(401)
  })
})

describe('library endpoints', () => {
  it('stores ratings and wishlist per user and validates input', async () => {
    const { app, dune } = makeApp()
    const cookie = await login(app)
    expect((await call(app, cookie, 'PUT', `/api/ratings/${dune}`, { value: 1, isRead: true })).status).toBe(204)
    expect(await (await call(app, cookie, 'GET', '/api/ratings')).json()).toEqual({ ratings: { [dune]: 1 } })
    expect((await call(app, cookie, 'PUT', `/api/ratings/${dune}`, { value: 5 })).status).toBe(400)
    expect((await call(app, cookie, 'PUT', '/api/ratings/missing', { value: 1 })).status).toBe(404)

    expect((await call(app, cookie, 'PUT', `/api/wishlist/${dune}`)).status).toBe(204)
    expect(await (await call(app, cookie, 'GET', '/api/wishlist')).json()).toEqual({
      bookIds: [dune],
      books: [{ bookId: dune, title: 'Dune', authors: ['Author'], genres: ['science_fiction'] }],
    })
    expect((await call(app, cookie, 'DELETE', `/api/wishlist/${dune}`)).status).toBe(204)
    expect(await (await call(app, cookie, 'GET', '/api/wishlist')).json()).toEqual({ bookIds: [], books: [] })

    const other = await login(app)
    expect(await (await call(app, other, 'GET', '/api/ratings')).json()).toEqual({ ratings: {} })
  })

  it('saves the profile and updates privacy flags', async () => {
    const { app } = makeApp()
    const cookie = await login(app)
    expect(await (await call(app, cookie, 'GET', '/api/profile')).json()).toEqual({ profile: null })
    expect((await call(app, cookie, 'PATCH', '/api/profile', { personalizationEnabled: false })).status).toBe(404)
    expect((await call(app, cookie, 'PUT', '/api/profile', { interests: ['nonsense'], consent: true })).status).toBe(400)
    expect((await call(app, cookie, 'PUT', '/api/profile', { interests: ['fantasy'], consent: true })).status).toBe(204)
    expect((await call(app, cookie, 'PATCH', '/api/profile', { aiDescriptionsEnabled: false })).status).toBe(204)
    expect(await (await call(app, cookie, 'GET', '/api/profile')).json()).toEqual({
      profile: { interests: ['fantasy'], personalizationEnabled: true, aiDescriptionsEnabled: false },
    })
  })

  it('searches and lists popular books', async () => {
    const { app } = makeApp()
    const cookie = await login(app)
    const found = (await (await call(app, cookie, 'GET', '/api/books/search?q=austen')).json()) as { title: string }[]
    expect(found.map((book) => book.title)).toEqual(['Emma'])
    const popular = (await (await call(app, cookie, 'GET', '/api/books/popular?interests=science_fiction')).json()) as { title: string }[]
    expect(popular.map((book) => book.title)).toEqual(['Dune'])
  })
})

describe('recommendations and book of the day', () => {
  it('recommends popular books at cold start with scores between 0 and 1', async () => {
    const { app } = makeApp()
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
    const { app, dune } = makeApp()
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
    const { app } = makeApp({ ai: true })
    const cookie = await login(app)
    const first = await (await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-12')).json()
    const second = await (await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-12')).json()
    expect(second).toEqual(first)
    expect(first).toMatchObject({ description: 'Generated blurb.', aiGenerated: true })
  })

  it('uses the catalog description when AI is not configured and rejects far dates', async () => {
    const { app } = makeApp()
    const cookie = await login(app)
    const body = await (await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-12')).json()
    expect(body).toMatchObject({ description: 'Catalog dune.', aiGenerated: false })
    expect((await call(app, cookie, 'GET', '/api/book-of-day?day=2026-11-20')).status).toBe(400)
  })
})

describe('books without embeddings', () => {
  it('keeps recommending by popularity after a rating when no vectors exist', async () => {
    const db = openDatabase(':memory:')
    const first = insertBook(db, { title: 'First', popularity: 5 })
    insertBook(db, { title: 'Second', popularity: 4 })
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
    const { app } = makeApp()
    const cookie = await login(app)
    const response = await call(app, cookie, 'POST', '/api/chat', { message: 'hi' })
    expect(response.status).toBe(503)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('ai_unavailable')
  })

  it('streams SSE events and enforces the body schema', async () => {
    const { app } = makeApp({ ai: true })
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
    const { app } = makeApp({ ai: true })
    const cookie = await login(app)
    for (let i = 0; i < 20; i++) {
      expect((await (await call(app, cookie, 'POST', '/api/chat', { message: `q${i}` })).text()).length).toBeGreaterThan(0)
    }
    expect((await call(app, cookie, 'POST', '/api/chat', { message: 'one more' })).status).toBe(429)
  })
})

describe('account deletion endpoint', () => {
  it('requires the password, then removes the user, clears the cookie and invalidates the session', async () => {
    const { app, dune, db } = makeApp()
    const cookie = await login(app)
    await call(app, cookie, 'PUT', `/api/ratings/${dune}`, { value: 1 })
    expect((await call(app, cookie, 'DELETE', '/api/me')).status).toBe(400)
    expect((await call(app, cookie, 'DELETE', '/api/me', { password: 'wrong password' })).status).toBe(401)
    expect(db.prepare('select count(*) as c from users').get()).toEqual({ c: 1 })

    const response = await call(app, cookie, 'DELETE', '/api/me', { password: 'secret password' })
    expect(response.status).toBe(204)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(db.prepare('select count(*) as c from ratings').get()).toEqual({ c: 0 })
    expect(db.prepare('select count(*) as c from users').get()).toEqual({ c: 0 })
    expect(db.prepare('select count(*) as c from sessions').get()).toEqual({ c: 0 })
    expect((await call(app, cookie, 'GET', '/api/ratings')).status).toBe(401)
  })

  it('does not allow deleting without a session', async () => {
    const { app } = makeApp()
    expect((await app(new Request('http://localhost/api/me', { method: 'DELETE', body: JSON.stringify({ password: 'x' }) }))).status).toBe(401)
  })
})

describe('auth endpoints', () => {
  const credentials = { username: 'Reader', password: 'secret password' }

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
    const { app } = makeApp()
    const { cookie, recoveryCode } = await register(app)
    expect(recoveryCode).toMatch(/^([0-9A-F]{4}-){4}[0-9A-F]{4}$/)
    expect(await (await call(app, cookie, 'GET', '/api/auth/me')).json()).toEqual({ registered: true, username: 'reader' })
  })

  it('rejects a taken username and invalid credentials', async () => {
    const { app } = makeApp()
    await register(app)
    const taken = await app(new Request('http://localhost/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) }))
    expect(taken.status).toBe(409)
    expect(((await taken.json()) as { error: { code: string } }).error.code).toBe('username_taken')
    const bad = (body: unknown) => app(new Request('http://localhost/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
    expect((await bad({ username: 'a', password: 'secret password' })).status).toBe(400)
    expect((await bad({ username: 'fresh', password: 'short' })).status).toBe(400)
  })

  it('logs in from another browser and sees the same data', async () => {
    const { app, dune } = makeApp()
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
    const { app } = makeApp()
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
    const { app } = makeApp()
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
    const { app } = makeApp()
    expect((await app(new Request('http://localhost/api/auth/logout', { method: 'POST' }))).status).toBe(204)
    expect((await app(new Request('http://localhost/api/auth/logout-all', { method: 'POST' }))).status).toBe(401)
  })

  it('changes the password, closing other sessions but keeping the current one', async () => {
    const { app } = makeApp()
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
    const { app } = makeApp()
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
    const { app, dune } = makeApp()
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
    const { app, dune } = makeApp()
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
    expect(await (await makeApp().app(new Request('http://localhost/api/capabilities'))).json()).toEqual({ ai: false })
    expect(await (await makeApp({ ai: true }).app(new Request('http://localhost/api/capabilities'))).json()).toEqual({ ai: true })
  })
})

describe('static files', () => {
  it('serves files, falls back to index.html for routes and 404s for missing files', async () => {
    const { app } = makeApp()
    const index = await app(new Request('http://localhost/profile'))
    expect(await index.text()).toBe('<html>app</html>')
    const script = await app(new Request('http://localhost/main.js'))
    expect(script.headers.get('content-type')).toContain('javascript')
    expect((await app(new Request('http://localhost/missing.js'))).status).toBe(404)
  })

  it('does not serve files outside the web root', async () => {
    const { app } = makeApp()
    const response = await app(new Request('http://localhost/..%2F..%2Fetc%2Fpasswd.txt'))
    expect(response.status).toBe(404)
  })

  it('returns 404 for unknown API paths', async () => {
    const { app } = makeApp()
    expect((await app(new Request('http://localhost/api/unknown'))).status).toBe(404)
  })
})
