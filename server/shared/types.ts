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
  embedding: number[] | null
}

export type Rating = {
  bookId: string
  value: 1 | -1
}

export type Profile = {
  interests: string[]
  personalizationEnabled: boolean
  aiDescriptionsEnabled: boolean
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
