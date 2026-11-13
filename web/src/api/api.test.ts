import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, chatStream, request } from './client.ts'
import { parseFrames, readSse } from './sse.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

async function collect<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = []
  for await (const item of generator) {
    items.push(item)
  }
  return items
}

describe('sse parsing', () => {
  it('splits frames and keeps the unfinished rest', () => {
    const { frames, rest } = parseFrames('event: token\ndata: {"text":"a"}\n\nevent: done\ndata: {}\n\nevent: tok')
    expect(frames).toEqual([
      { event: 'token', data: '{"text":"a"}' },
      { event: 'done', data: '{}' },
    ])
    expect(rest).toBe('event: tok')
  })

  it('ignores blocks without an event or data', () => {
    expect(parseFrames('data: x\n\nevent: y\n\n').frames).toEqual([])
  })

  it('reassembles frames split across chunks, even inside multi-byte characters', async () => {
    const full = 'event: token\ndata: {"text":"Привет"}\n\n'
    const bytes = new TextEncoder().encode(full)
    const cut = bytes.length - 12
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, cut))
        controller.enqueue(bytes.slice(cut))
        controller.close()
      },
    })
    expect(await collect(readSse(body))).toEqual([{ event: 'token', data: '{"text":"Привет"}' }])
  })

  it('accepts CRLF line endings', async () => {
    const frames = await collect(readSse(stream(['event: done\r\ndata: {}\r\n\r\n'])))
    expect(frames).toEqual([{ event: 'done', data: '{}' }])
  })
})

describe('request', () => {
  it('sends credentials and a JSON body and returns parsed JSON', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await request('/api/x', { method: 'POST', body: { a: 1 } })).toEqual({ ok: true })
    const [path, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(path).toBe('/api/x')
    expect(init.credentials).toBe('same-origin')
    expect(init.body).toBe('{"a":1}')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('returns undefined for 204', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    expect(await request('/api/x')).toBeUndefined()
  })

  it('maps the server error format to ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { code: 'username_taken', message: 'Taken' } }), { status: 409 })),
    )
    await expect(request('/api/x')).rejects.toMatchObject({ status: 409, code: 'username_taken', message: 'Taken' })
  })

  it('reports network failures with a stable code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))
    await expect(request('/api/x')).rejects.toMatchObject({ status: 0, code: 'network_error' })
  })

  it('uses a generic code when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('oops', { status: 502 })))
    await expect(request('/api/x')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('api helpers', () => {
  it('returns null for a missing book of the day and rethrows other errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'no_books', message: 'x' } }), { status: 404 })))
    expect(await api.bookOfDay('2026-11-13')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'x', message: 'x' } }), { status: 500 })))
    await expect(api.bookOfDay('2026-11-13')).rejects.toMatchObject({ status: 500 })
  })

  it('unwraps the profile, ratings and wishlist responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ profile: null, ratings: { a: 1 } }), { status: 200 })))
    expect(await api.profile()).toBeNull()
    expect(await api.ratings()).toEqual({ a: 1 })
  })

  it('encodes search queries and popular interests', async () => {
    const fetchMock = vi.fn(async () => new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await api.search('мастер & маргарита')
    await api.popular(['fantasy', 'mystery'])
    const paths = fetchMock.mock.calls.map((call) => (call as unknown as [string])[0])
    expect(paths[0]).toBe('/api/books/search?q=%D0%BC%D0%B0%D1%81%D1%82%D0%B5%D1%80%20%26%20%D0%BC%D0%B0%D1%80%D0%B3%D0%B0%D1%80%D0%B8%D1%82%D0%B0')
    expect(paths[1]).toBe('/api/books/popular?interests=fantasy%2Cmystery&limit=12')
  })
})

describe('chat stream', () => {
  it('yields typed events as they arrive', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          stream([
            'event: books\ndata: {"books":[],"context":{"interests":["fantasy"],"likedCount":1,"dislikedCount":0}}\n\n',
            'event: token\ndata: {"text":"Hi"}\n\nevent: done\ndata: {}\n\n',
          ]),
          { status: 200 },
        ),
      ),
    )
    const events = await collect(chatStream('hello'))
    expect(events.map((event) => event.event)).toEqual(['books', 'token', 'done'])
  })

  it('throws ApiError with the status when the server refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'x' } }), { status: 429 })))
    await expect(collect(chatStream('hello'))).rejects.toMatchObject({ status: 429, code: 'rate_limited' })
  })
})
