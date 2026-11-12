import type { ChatMessage } from '../shared/llm.ts'
import type { Book } from '../shared/types.ts'
import { DESCRIPTION_SYSTEM_PROMPT } from '../chat/prompts.ts'
import { CATALOG_SNIPPET_LENGTH } from './constants.ts'

export function descriptionMessages(book: Book, language: string): ChatMessage[] {
  return [
    { role: 'system', content: DESCRIPTION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: JSON.stringify({
        language,
        title: book.title,
        authors: book.authors,
        genres: book.genres,
        catalogDescription: (book.description ?? '').slice(0, CATALOG_SNIPPET_LENGTH),
      }),
    },
  ]
}
