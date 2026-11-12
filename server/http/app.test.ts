import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
    },
    webRoot,
  )
  return { app, db, dune, emma }
}

type App = ReturnType<typeof makeApp>['app']

async function login(app: App): Promise<string> {
  const response = await app(new Request('http://localhost/api/session', { method: 'POST' }))
  expect(response.status).toBe(204)
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

describe('session', () => {
  it('rejects API calls without a session cookie in the common error format', async () => {
    const { app } = makeApp()
    const response = await app(new Request('http://localhost/api/recommendations'))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: { code: 'unauthorized', message: 'Missing or invalid session' } })
  })

  it('creates a session once and keeps it when the cookie is valid', async () => {
    const { app } = makeApp()
    const cookie = await login(app)
    const again = await call(app, cookie, 'POST', '/api/session')
    expect(again.status).toBe(204)
    expect(again.headers.get('set-cookie')).toBeNull()
  })

  it('rejects an unknown token', async () => {
    const { app } = makeApp()
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
    expect(await (await call(app, cookie, 'GET', '/api/wishlist')).json()).toEqual({ bookIds: [dune] })
    expect((await call(app, cookie, 'DELETE', `/api/wishlist/${dune}`)).status).toBe(204)
    expect(await (await call(app, cookie, 'GET', '/api/wishlist')).json()).toEqual({ bookIds: [] })

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
    const items = (await (await call(app, cookie, 'GET', '/api/recommendations')).json()) as { title: string; score: number; rank: number }[]
    expect(items[0]).toMatchObject({ title: 'Dune', rank: 1 })
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
      reasons: { percent: number }[]
      description: { text: string; aiGenerated: boolean }
    }
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
    const app = createApp({ db, llm: null, embed: null, now: () => new Date('2026-11-12T10:00:00Z') }, webRoot)
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
  it('removes the user, clears the cookie and invalidates the session', async () => {
    const { app, dune, db } = makeApp()
    const cookie = await login(app)
    await call(app, cookie, 'PUT', `/api/ratings/${dune}`, { value: 1 })
    const response = await call(app, cookie, 'DELETE', '/api/me')
    expect(response.status).toBe(204)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(db.prepare('select count(*) as c from ratings').get()).toEqual({ c: 0 })
    expect(db.prepare('select count(*) as c from users').get()).toEqual({ c: 0 })
    expect((await call(app, cookie, 'GET', '/api/ratings')).status).toBe(401)
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
