import type { Embedder, ChatMessage } from '../shared/llm.ts'
import type { Book } from '../shared/types.ts'
import { CANDIDATE_COUNT, DESCRIPTION_SNIPPET_LENGTH } from './constants.ts'
import { ANSWER_SYSTEM_PROMPT, SELECT_SYSTEM_PROMPT } from './prompts.ts'
import { selectWithRetry } from './select.ts'
import type { ChatBook, ChatEvent } from './sse.ts'

export type ChatProfile = {
  interests: string[]
  likedTitles: string[]
  dislikedTitles: string[]
}

export type ChatDeps = {
  embed: Embedder
  findCandidates: (embedding: number[], count: number) => Promise<Book[]>
  completeJson: (messages: ChatMessage[]) => Promise<string>
  stream: (messages: ChatMessage[]) => AsyncIterable<string>
  saveExchange: (userMessage: string, answer: string, bookIds: string[]) => Promise<void>
}

function snippet(text: string | null): string {
  return (text ?? '').slice(0, DESCRIPTION_SNIPPET_LENGTH)
}

function candidatePayload(book: Book): Record<string, unknown> {
  return { id: book.id, title: book.title, authors: book.authors, genres: book.genres, description: snippet(book.description) }
}

function profilePayload(profile: ChatProfile): Record<string, unknown> {
  return { interests: profile.interests, liked: profile.likedTitles, disliked: profile.dislikedTitles }
}

function toChatBook(book: Book): ChatBook {
  return { bookId: book.id, title: book.title, authors: book.authors, genres: book.genres }
}

export async function* runChat(deps: ChatDeps, message: string, profile: ChatProfile): AsyncGenerator<ChatEvent> {
  let selected: Book[]
  try {
    const embedding = await deps.embed(message)
    const candidates = await deps.findCandidates(embedding, CANDIDATE_COUNT)
    const ids =
      candidates.length === 0
        ? []
        : await selectWithRetry(
            () =>
              deps.completeJson([
                { role: 'system', content: SELECT_SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: JSON.stringify({ profile: profilePayload(profile), message, candidates: candidates.map(candidatePayload) }),
                },
              ]),
            candidates.map((book) => book.id),
          )
    selected = ids.flatMap((id) => candidates.filter((book) => book.id === id))
  } catch {
    yield { event: 'error', data: { message: 'Could not select books' } }
    return
  }

  yield {
    event: 'books',
    data: {
      books: selected.map(toChatBook),
      context: { interests: profile.interests, likedCount: profile.likedTitles.length, dislikedCount: profile.dislikedTitles.length },
    },
  }

  let answer = ''
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: ANSWER_SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ profile: profilePayload(profile), message, selectedBooks: selected.map(candidatePayload) }) },
    ]
    for await (const piece of deps.stream(messages)) {
      answer += piece
      yield { event: 'token', data: { text: piece } }
    }
    await deps.saveExchange(
      message,
      answer,
      selected.map((book) => book.id),
    )
  } catch {
    yield { event: 'error', data: { message: 'Could not generate the answer' } }
    return
  }
  yield { event: 'done', data: {} }
}
