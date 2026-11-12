import { z } from 'zod'
import { MAX_SELECTED_BOOKS, SELECTION_ATTEMPTS } from './constants.ts'

const selectionSchema = z.object({ book_ids: z.array(z.string()) })

export function parseSelection(raw: string, candidateIds: string[]): string[] {
  const parsed = selectionSchema.parse(JSON.parse(raw))
  const allowed = new Set(candidateIds)
  const unique = [...new Set(parsed.book_ids)]
  return unique.filter((id) => allowed.has(id)).slice(0, MAX_SELECTED_BOOKS)
}

export async function selectWithRetry(
  complete: () => Promise<string>,
  candidateIds: string[],
  attempts: number = SELECTION_ATTEMPTS,
): Promise<string[]> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return parseSelection(await complete(), candidateIds)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}
