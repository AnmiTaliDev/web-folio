import type { Book } from '../shared/types.ts'

export function toSummary(book: Book): { bookId: string; title: string; authors: string[]; genres: string[]; minAge: number } {
  return { bookId: book.id, title: book.title, authors: book.authors, genres: book.genres, minAge: book.minAge }
}
