import type { ChatMessage } from '../shared/llm.ts'
import type { Book } from '../shared/types.ts'
import type { ScoredBook } from '../recommend/pipeline.ts'
import { RECENT_DAYS } from './constants.ts'
import { daysBefore } from './day.ts'
import { descriptionMessages } from './describe.ts'
import { pickBookOfDay } from './pick.ts'

export type BookOfDayRow = {
  bookId: string
  score: number
  description: string | null
  model: string | null
}

export type BookOfDayDeps = {
  findRow: (day: string) => Promise<BookOfDayRow | null>
  recentBookIds: (sinceDay: string) => Promise<string[]>
  recommend: () => Promise<ScoredBook[]>
  aiDescriptionsEnabled: boolean
  complete: (messages: ChatMessage[]) => Promise<string>
  model: string
  insertRow: (day: string, row: BookOfDayRow) => Promise<void>
  deleteRow: (day: string) => Promise<void>
  isRated: (bookId: string) => Promise<boolean>
  loadBook: (id: string) => Promise<Book>
}

export type BookOfDay = {
  book: Book
  score: number
  description: string | null
  aiGenerated: boolean
}

async function toResult(deps: BookOfDayDeps, row: BookOfDayRow): Promise<BookOfDay> {
  return {
    book: await deps.loadBook(row.bookId),
    score: row.score,
    description: row.description,
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

export async function getBookOfDay(deps: BookOfDayDeps, day: string, language: string): Promise<BookOfDay | null> {
  const existing = await deps.findRow(day)
  if (existing) {
    if (!(await deps.isRated(existing.bookId))) {
      return toResult(deps, existing)
    }
    await deps.deleteRow(day)
  }

  const recent = new Set(await deps.recentBookIds(daysBefore(day, RECENT_DAYS)))
  const picked = pickBookOfDay(await deps.recommend(), recent)
  if (!picked) {
    return null
  }

  const description = await describeBook(deps, picked.book, language)
  await deps.insertRow(day, { bookId: picked.book.id, score: picked.score, description: description.text, model: description.model })

  const stored = await deps.findRow(day)
  return stored ? toResult(deps, stored) : null
}
