import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client.ts'
import { chat, failureFor } from './chat.ts'
import { library } from './library.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  chat.reset()
  library.reset()
})

function sse(...frames: string[]): Response {
  return new Response(frames.join(''), { status: 200 })
}

describe('failureFor', () => {
  it('classifies chat errors', () => {
    expect(failureFor(new ApiError(503, 'ai_unavailable', 'x'))).toBe('unavailable')
    expect(failureFor(new ApiError(429, 'rate_limited', 'x'))).toBe('limit')
    expect(failureFor(new ApiError(500, 'x', 'x'))).toBe('generic')
    expect(failureFor(new Error('x'))).toBe('generic')
  })
})

describe('chat store', () => {
  it('streams tokens and books into the assistant message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sse(
          'event: books\ndata: {"books":[{"bookId":"1","title":"T","authors":["A"],"genres":[]}],"context":{"interests":["fantasy"],"likedCount":2,"dislikedCount":0}}\n\n',
          'event: token\ndata: {"text":"Вот "}\n\nevent: token\ndata: {"text":"книга"}\n\nevent: done\ndata: {}\n\n',
        ),
      ),
    )
    await chat.send('  посоветуй  ')
    const [user, assistant] = chat.messages()
    expect(user?.text).toBe('посоветуй')
    expect(assistant?.text).toBe('Вот книга')
    expect(assistant?.books).toHaveLength(1)
    expect(assistant?.context?.likedCount).toBe(2)
    expect(chat.busy()).toBe(false)
    expect(chat.failure()).toBeNull()
  })

  it('records a rate limit and drops the empty assistant message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'x' } }), { status: 429 })))
    await chat.send('hi')
    expect(chat.failure()).toBe('limit')
    expect(chat.messages()).toHaveLength(1)
  })

  it('ignores blank input', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await chat.send('   ')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('chat history', () => {
  it('shows the stored messages once and does not overwrite a conversation that has started', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        messages: [
          { id: 'a', role: 'user', text: 'Привет', createdAt: '2026-11-12T09:00:00.000Z', books: [] },
          { id: 'b', role: 'assistant', text: 'Здравствуйте', createdAt: '2026-11-12T09:00:01.000Z', books: [{ bookId: '1', title: 'T', authors: ['A'], genres: [] }] },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await chat.loadHistory()
    await chat.loadHistory()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(chat.messages().map((message) => message.text)).toEqual(['Привет', 'Здравствуйте'])
    expect(chat.messages()[1]?.books).toHaveLength(1)
  })

  it('clears the conversation on the server and in the store', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('fetch', vi.fn(async (_path: string, init?: RequestInit) => (init?.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ messages: [{ id: 'a', role: 'user', text: 'x', createdAt: '', books: [] }] }))))
    await chat.loadHistory()
    expect(chat.messages()).toHaveLength(1)
    await chat.clearHistory()
    expect(chat.messages()).toEqual([])
  })
})

describe('shelf statuses', () => {
  const book = { bookId: 'b9', title: 'T', authors: ['A'], genres: [] }

  it('keeps one status per book and derives the want list from it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    await library.setStatus(book, 'reading')
    expect(library.statusOf('b9')).toBe('reading')
    expect(library.wishIds().has('b9')).toBe(false)
    await library.setStatus(book, 'want')
    expect(library.statusOf('b9')).toBe('want')
    expect(library.wishBooks()).toEqual([book])
    await library.setStatus(book, 'read')
    expect(library.shelf()).toHaveLength(1)
    await library.setStatus(book, null)
    expect(library.statusOf('b9')).toBeUndefined()
  })

  it('toggles the want status and rolls back when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    await library.toggleSaved(book)
    expect(library.statusOf('b9')).toBe('want')
    await library.toggleSaved(book)
    expect(library.statusOf('b9')).toBeUndefined()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'x', message: 'x' } }), { status: 500 })))
    await expect(library.setStatus(book, 'read')).rejects.toBeInstanceOf(ApiError)
    expect(library.statusOf('b9')).toBeUndefined()
  })
})

describe('library store', () => {
  const book = { bookId: 'b1', title: 'T', authors: ['A'], genres: [] }

  it('toggles a rating and clears it on the same value', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    await library.rate('b1', 1)
    expect(library.ratings()).toEqual({ b1: 1 })
    await library.rate('b1', -1)
    expect(library.ratings()).toEqual({ b1: -1 })
    await library.rate('b1', -1)
    expect(library.ratings()).toEqual({})
  })

  it('rolls a rating back when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'x', message: 'x' } }), { status: 500 })))
    await expect(library.rate('b1', 1)).rejects.toBeInstanceOf(ApiError)
    expect(library.ratings()).toEqual({})
  })

  it('toggles the wishlist and rolls back on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    await library.toggleSaved(book)
    expect(library.wishIds().has('b1')).toBe(true)
    expect(library.wishBooks()).toEqual([book])
    await library.toggleSaved(book)
    expect(library.wishIds().size).toBe(0)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'x', message: 'x' } }), { status: 500 })))
    await expect(library.toggleSaved(book)).rejects.toBeInstanceOf(ApiError)
    expect(library.wishIds().size).toBe(0)
  })
})
