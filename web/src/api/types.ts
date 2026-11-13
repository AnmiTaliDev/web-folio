export type Book = {
  bookId: string
  title: string
  authors: string[]
  genres: string[]
  description?: string | null
  minAge?: number
}

export type Recommendation = Book & { score: number; rank: number; mode: string }

export type Reason = {
  type: 'liked_book' | 'genre' | 'similar_readers' | 'popular'
  percent: number
  title?: string | null
  genres?: string[]
}

export type Explanation = {
  score: number
  mode: string
  reasons: Reason[]
  description: { text: string | null; aiGenerated: boolean }
}

export type BookOfDay = {
  book: Book
  score: number
  description: string | null
  aiGenerated: boolean
}

export type Profile = {
  interests: string[]
  personalizationEnabled: boolean
  aiDescriptionsEnabled: boolean
  maxAge: number | null
}

export type Taste = { readCount: number; likedCount: number; topGenres: string[] }

export type SessionInfo = { id: string; createdAt: string; lastSeenAt: string; userAgent: string; current: boolean }

export type AuthStatus = { registered: boolean; username: string | null }

export type ChatContext = { interests: string[]; likedCount: number; dislikedCount: number }

export type ChatEvent =
  | { event: 'books'; data: { books: Book[]; context: ChatContext } }
  | { event: 'token'; data: { text: string } }
  | { event: 'done'; data: Record<string, never> }
  | { event: 'error'; data: { message: string } }
