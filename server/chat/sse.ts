export type ChatBook = {
  bookId: string
  title: string
  authors: string[]
  genres: string[]
}

export type ChatContextSummary = {
  interests: string[]
  likedCount: number
  dislikedCount: number
}

export type ChatEvent =
  | { event: 'books'; data: { books: ChatBook[]; context: ChatContextSummary } }
  | { event: 'token'; data: { text: string } }
  | { event: 'done'; data: Record<string, never> }
  | { event: 'error'; data: { message: string } }

export function formatSse(chatEvent: ChatEvent): string {
  return `event: ${chatEvent.event}\ndata: ${JSON.stringify(chatEvent.data)}\n\n`
}
