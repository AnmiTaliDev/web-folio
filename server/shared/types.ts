export type Book = {
  id: string
  isbn13: string | null
  title: string
  authors: string[]
  description: string | null
  genres: string[]
  language: string
  firstPublishYear: number | null
  popularity: number
  minAge: number
  themes: string[]
  difficulty: string | null
  length: string | null
  overview: string | null
  embedding: number[] | null
}

export type Rating = {
  bookId: string
  value: 1 | -1
}

export const AGE_LEVELS = [6, 12, 16, 18] as const
export type AgeLimit = (typeof AGE_LEVELS)[number] | null

export type Profile = {
  interests: string[]
  personalizationEnabled: boolean
  aiDescriptionsEnabled: boolean
  maxAge: AgeLimit
}

export type ReasonType = 'liked_book' | 'genre' | 'similar_readers' | 'popular'

export type Reason = {
  type: ReasonType
  label: string
  percent: number
  bookId?: string
  title?: string
  genres?: string[]
}
