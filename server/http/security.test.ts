import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createThrottle } from '../auth/throttle.ts'
import { openDatabase } from '../db/database.ts'
import { createApp } from './app.ts'
import { createRateLimits } from './security.ts'
import { cacheControlFor, serveStatic } from './static-files.ts'

let webRoot = ''

beforeAll(async () => {
  webRoot = mkdtempSync(join(tmpdir(), 'folio-sec-'))
  mkdirSync(join(webRoot, 'assets'))
  writeFileSync(join(webRoot, 'index.html'), '<html>app</html>')
  writeFileSync(join(webRoot, 'assets', 'index-abc.js'), 'console.log(1)')
  writeFileSync(join(webRoot, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
})

afterAll(async () => {
  rmSync(webRoot, { recursive: true, force: true })
})

async function makeApp(now: () => Date = () => new Date('2026-11-12T10:00:00Z')) {
  return createApp({ db: await openDatabase(':memory:'), llm: null, embed: null, now, throttle: createThrottle(now), limits: createRateLimits(now) }, webRoot)
}

const register = (app: Awaited<ReturnType<typeof makeApp>>, name: string, headers: Record<string, string> = {}) =>
  app(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ username: name, password: 'secret password', acceptTerms: true }),
    }),
  )

describe('security headers', () => {
  it('are sent with API and static responses', async () => {
    const app = await makeApp()
    for (const path of ['/api/capabilities', '/', '/missing.png']) {
      const response = await app(new Request(`http://localhost${path}`))
      expect(response.headers.get('content-security-policy'), path).toContain("default-src 'self'")
      expect(response.headers.get('content-security-policy'), path).toContain("frame-ancestors 'none'")
      expect(response.headers.get('x-content-type-options'), path).toBe('nosniff')
      expect(response.headers.get('referrer-policy'), path).toBe('no-referrer')
      expect(response.headers.get('x-frame-options'), path).toBe('DENY')
    }
  })

  it('mark API responses as not cacheable and send HSTS only behind https', async () => {
    const app = await makeApp()
    const api = await app(new Request('http://localhost/api/capabilities'))
    expect(api.headers.get('cache-control')).toBe('no-store')
    expect(api.headers.get('strict-transport-security')).toBeNull()
    const secure = await app(new Request('http://localhost/api/capabilities', { headers: { 'x-forwarded-proto': 'https' } }))
    expect(secure.headers.get('strict-transport-security')).toContain('max-age=')
  })

  it('keep the session cookie and its attributes intact', async () => {
    const response = await register(await makeApp(), 'cookie.user')
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
  })
})

describe('origin check', () => {
  it('rejects a state changing request from another origin and allows the same one', async () => {
    const app = await makeApp()
    const foreign = await register(app, 'evil.user', { origin: 'https://evil.example', host: 'folio.test' })
    expect(foreign.status).toBe(403)
    expect(((await foreign.json()) as { error: { code: string } }).error.code).toBe('bad_origin')
    expect((await register(app, 'good.user', { origin: 'https://folio.test', host: 'folio.test' })).status).toBe(200)
    expect((await register(app, 'plain.user')).status).toBe(200)
    expect((await register(app, 'broken.user', { origin: 'not a url', host: 'folio.test' })).status).toBe(403)
  })

  it('does not restrict reads', async () => {
    const response = await (await makeApp())(new Request('http://localhost/api/capabilities', { headers: { origin: 'https://evil.example', host: 'folio.test' } }))
    expect(response.status).toBe(200)
  })
})

describe('rate limits', () => {
  it('stop the sixth registration from one client within an hour and are per client', async () => {
    const app = await makeApp()
    for (let index = 0; index < 5; index++) {
      expect((await register(app, `user${index}`, { 'x-folio-client': '10.0.0.1' })).status).toBe(200)
    }
    const blocked = await register(app, 'user5', { 'x-folio-client': '10.0.0.1' })
    expect(blocked.status).toBe(429)
    expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe('rate_limited')
    expect((await register(app, 'user6', { 'x-folio-client': '10.0.0.2' })).status).toBe(200)
  })

  it('release the limit after the window passes', async () => {
    let time = new Date('2026-11-12T10:00:00Z').getTime()
    const limits = createRateLimits(() => new Date(time), { test: { limit: 2, windowMs: 1000 } })
    limits.check('test', 'a')
    limits.check('test', 'a')
    expect(() => limits.check('test', 'a')).toThrow()
    time += 1500
    expect(() => limits.check('test', 'a')).not.toThrow()
    expect(() => limits.check('unknown-bucket', 'a')).not.toThrow()
  })
})

describe('static files', () => {
  it('cache hashed assets for a year and never cache the entry page', async () => {
    expect(cacheControlFor('/assets/index-abc.js')).toContain('immutable')
    const asset = await serveStatic(webRoot, '/assets/index-abc.js')
    expect(asset.headers.get('cache-control')).toContain('max-age=31536000')
    const index = await serveStatic(webRoot, '/')
    expect(index.headers.get('cache-control')).toBe('no-cache')
  })

  it('serve svg with its type, reject malformed paths and never leave the web root', async () => {
    expect((await serveStatic(webRoot, '/favicon.svg')).headers.get('content-type')).toBe('image/svg+xml')
    expect((await serveStatic(webRoot, '/%E0%A4%A')).status).toBe(400)
    const secret = join(tmpdir(), 'folio-secret.txt')
    writeFileSync(secret, 'secret')
    try {
      expect((await serveStatic(webRoot, '/../folio-secret.txt')).status).toBe(404)
      expect((await serveStatic(webRoot, '/..%2ffolio-secret.txt')).status).toBe(404)
    } finally {
      rmSync(secret, { force: true })
    }
    expect(await (await serveStatic(webRoot, '/../../etc/passwd')).text()).toBe('<html>app</html>')
  })
})
