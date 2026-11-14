import type { ChatMessage } from '../shared/llm.ts'
import type { Book } from '../shared/types.ts'
import type { ScoredBook } from '../recommend/pipeline.ts'
import { descriptionMessages } from './describe.ts'
import { pickBookOfDay } from './pick.ts'

export type BookOfDayRow = {
  bookId: string
  score: number
  description: string | null
  model: string | null
}

export type BookOfDayDeps = {
  findRow: (day: string) => BookOfDayRow | null
  previousBookIds: () => string[]
  recommend: () => Promise<ScoredBook[]>
  aiDescriptionsEnabled: boolean
  complete: (messages: ChatMessage[]) => Promise<string>
  model: string
  insertRow: (day: string, row: BookOfDayRow) => void
  deleteRow: (day: string) => void
  isRated: (bookId: string) => boolean
  loadBook: (id: string) => Book
}

export type BookOfDay = {
  book: Book
  score: number
  description: string | null
  aiGenerated: boolean
}

function toResult(deps: BookOfDayDeps, row: BookOfDayRow): BookOfDay {
  const book = deps.loadBook(row.bookId)
  return {
    book,
    score: row.score,
    description: row.model === null ? book.description : row.description,
    aiGenerated: row.model !== null,
  }
}

async function describeBook(deps: BookOfDayDeps, book: Book, language: string): Promise<{ text: string | null; model: string | null }> {
  if (!deps.aiDescriptionsEnabled) {
    return { text: book.description, model: null }
  }
  try {
    const text = (await deps.complete(descriptionMessages(book, language))).trim()
    return text ? { text, model: deps.model } : { text: book.description, model: null }
  } catch {
    return { text: book.description, model: null }
  }
}

export async function getBookOfDay(deps: BookOfDayDeps, day: string, language: string, seed: string): Promise<BookOfDay | null> {
  const existing = deps.findRow(day)
  if (existing) {
    if (!(deps.isRated(existing.bookId))) {
      return toResult(deps, existing)
    }
    deps.deleteRow(day)
  }

  const previous = new Set(deps.previousBookIds())
  const picked = pickBookOfDay(await deps.recommend(), previous, `${seed}:${day}`)
  if (!picked) {
    return null
  }

  const description = await describeBook(deps, picked.book, language)
  deps.insertRow(day, { bookId: picked.book.id, score: picked.score, description: description.text, model: description.model })

  const stored = deps.findRow(day)
  return stored ? toResult(deps, stored) : null
}
