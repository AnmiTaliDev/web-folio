import type { Db } from '../db/database.ts'
import { descriptionMessages } from '../book-of-day/describe.ts'
import { buildReasons } from '../recommend/explain.ts'
import { scoreOneBook } from '../recommend/recommend.ts'
import { ApiError } from '../shared/errors.ts'
import type { ChatMessage, Llm } from '../shared/llm.ts'
import type { Book, Reason } from '../shared/types.ts'

export type DescriptionDeps = {
  aiDescriptionsEnabled: boolean
  storedAiDescription: () => string | null
  complete: (messages: ChatMessage[]) => Promise<string>
}

export type BookDescription = { text: string | null; aiGenerated: boolean }

export async function resolveDescription(deps: DescriptionDeps, book: Book, language: string): Promise<BookDescription> {
  if (!deps.aiDescriptionsEnabled) {
    return { text: book.description, aiGenerated: false }
  }
  const stored = deps.storedAiDescription()
  if (stored) {
    return { text: stored, aiGenerated: true }
  }
  try {
    const text = (await deps.complete(descriptionMessages(book, language))).trim()
    return text ? { text, aiGenerated: true } : { text: book.description, aiGenerated: false }
  } catch {
    return { text: book.description, aiGenerated: false }
  }
}

export type Explanation = {
  score: number
  mode: string
  reasons: Reason[]
  description: BookDescription
}

function findStoredAiDescription(db: Db, userId: string, bookId: string): string | null {
  const row = db
    .prepare('select description from book_of_day where user_id = ? and book_id = ? and model is not null and description is not null limit 1')
    .get(userId, bookId) as { description: string } | undefined
  return row?.description ?? null
}

export async function explainBook(db: Db, llm: Llm | null, userId: string, bookId: string, language: string): Promise<Explanation> {
  const { scored, profile } = await scoreOneBook(db, userId, bookId)
  if (!scored) {
    throw new ApiError(404, 'not_found', 'Book not found')
  }
  const description = await resolveDescription(
    {
      aiDescriptionsEnabled: profile.aiDescriptionsEnabled && llm !== null,
      storedAiDescription: () => findStoredAiDescription(db, userId, bookId),
      complete: llm ? llm.complete : async () => '',
    },
    scored.book,
    language,
  )
  return { score: scored.score, mode: scored.mode, reasons: buildReasons(scored), description }
}
