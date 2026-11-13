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
