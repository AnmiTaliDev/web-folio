import { describe, expect, it } from 'vitest'
import { makeBook } from '../recommend/fixtures.ts'
import { runChat, type ChatDeps, type ChatProfile } from './chat.ts'
import { assertWithinLimit } from './rate-limit.ts'
import { parseSelection, selectWithRetry } from './select.ts'
import { formatSse, type ChatEvent } from './sse.ts'
import { ApiError } from '../shared/errors.ts'

const profile: ChatProfile = { interests: ['fantasy'], likedTitles: ['Dune'], dislikedTitles: [] }
const books = [makeBook('b1'), makeBook('b2'), makeBook('b3'), makeBook('b4'), makeBook('b5')]

type Recorded = { saved: { message: string; answer: string; ids: string[] }[]; prompts: string[] }

function makeDeps(completions: string[], tokens: string[] = ['Hello', ' world']): { deps: ChatDeps; recorded: Recorded } {
  const recorded: Recorded = { saved: [], prompts: [] }
  let call = 0
  const deps: ChatDeps = {
    embed: async () => [0, 1],
    findCandidates: () => books,
    completeJson: async (messages) => {
      recorded.prompts.push(messages[1]?.content ?? '')
      const value = completions[Math.min(call, completions.length - 1)] ?? ''
      call++
      return value
    },
    stream: async function* () {
      for (const token of tokens) {
        yield token
      }
    },
    saveExchange: (message, answer, ids) => {
      recorded.saved.push({ message, answer, ids })
    },
  }
  return { deps, recorded }
}

async function collect(generator: AsyncGenerator<ChatEvent>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = []
  for await (const event of generator) {
    events.push(event)
  }
  return events
}

describe('parseSelection', () => {
  it('drops ids that are not in the candidate list', () => {
    expect(parseSelection('{"book_ids":["b1","invented","b2"]}', ['b1', 'b2', 'b3'])).toEqual(['b1', 'b2'])
  })

  it('keeps at most three ids and removes duplicates', () => {
    expect(parseSelection('{"book_ids":["b1","b1","b2","b3","b4"]}', ['b1', 'b2', 'b3', 'b4'])).toEqual(['b1', 'b2', 'b3'])
  })

  it('rejects invalid JSON', () => {
    expect(() => parseSelection('not json', ['b1'])).toThrow()
  })

  it('rejects JSON of the wrong shape', () => {
    expect(() => parseSelection('{"ids":["b1"]}', ['b1'])).toThrow()
  })
})

describe('selectWithRetry', () => {
  it('retries once after invalid JSON', async () => {
    let calls = 0
    const result = await selectWithRetry(async () => (++calls === 1 ? 'oops' : '{"book_ids":["b1"]}'), ['b1'])
    expect(result).toEqual(['b1'])
    expect(calls).toBe(2)
  })

  it('gives up after the allowed attempts', async () => {
    let calls = 0
    await expect(selectWithRetry(async () => (++calls, 'oops'), ['b1'])).rejects.toThrow()
    expect(calls).toBe(2)
  })
})

describe('runChat', () => {
  it('emits books, tokens and done in order and saves the exchange', async () => {
    const { deps, recorded } = makeDeps(['{"book_ids":["b2","b4"]}'])
    const events = await collect(runChat(deps, 'something light', profile))
    expect(events.map((event) => event.event)).toEqual(['books', 'token', 'token', 'done'])
    const first = events[0]
    expect(first?.event === 'books' && first.data.books.map((book) => book.bookId)).toEqual(['b2', 'b4'])
    expect(first?.event === 'books' && first.data.context.interests).toEqual(['fantasy'])
    expect(recorded.saved).toEqual([{ message: 'something light', answer: 'Hello world', ids: ['b2', 'b4'] }])
  })

  it('never returns a book outside the candidate list', async () => {
    const { deps } = makeDeps(['{"book_ids":["made-up","b1"]}'])
    const events = await collect(runChat(deps, 'q', profile))
    const first = events[0]
    expect(first?.event === 'books' && first.data.books.map((book) => book.bookId)).toEqual(['b1'])
  })

  it('emits an error event when the model returns invalid JSON twice', async () => {
    const { deps, recorded } = makeDeps(['nope', 'still nope'])
    const events = await collect(runChat(deps, 'q', profile))
    expect(events.map((event) => event.event)).toEqual(['error'])
    expect(recorded.saved).toEqual([])
  })

  it('recovers when the second attempt is valid', async () => {
    const { deps } = makeDeps(['nope', '{"book_ids":["b3"]}'])
    const events = await collect(runChat(deps, 'q', profile))
    expect(events[0]?.event).toBe('books')
    expect(events.at(-1)?.event).toBe('done')
  })

  it('sends only interests and book titles to the model', async () => {
    const { deps, recorded } = makeDeps(['{"book_ids":[]}'])
    await collect(runChat(deps, 'q', profile))
    const payload = JSON.parse(recorded.prompts[0] ?? '{}') as { profile: Record<string, unknown> }
    expect(Object.keys(payload.profile).sort()).toEqual(['disliked', 'interests', 'liked'])
  })
})

describe('formatSse', () => {
  it('formats an event with a name and a JSON data line', () => {
    expect(formatSse({ event: 'token', data: { text: 'Hi' } })).toBe('event: token\ndata: {"text":"Hi"}\n\n')
  })

  it('formats done with an empty object', () => {
    expect(formatSse({ event: 'done', data: {} })).toBe('event: done\ndata: {}\n\n')
  })
})

describe('assertWithinLimit', () => {
  it('allows up to 19 recent messages', () => {
    expect(() => assertWithinLimit(19)).not.toThrow()
  })

  it('rejects the 21st message with status 429', () => {
    try {
      assertWithinLimit(20)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).status).toBe(429)
    }
  })
})
