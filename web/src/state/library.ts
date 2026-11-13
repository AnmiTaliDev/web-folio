import { createRoot, createSignal } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book, BookOfDay, Recommendation, Taste } from '../api/types.ts'
import { today } from '../lib/redirect.ts'

export type Loadable<T> = { state: 'idle' | 'loading' | 'ready' | 'error'; value?: T }

function loadable<T>(): [() => Loadable<T>, (next: Loadable<T>) => void] {
  const [value, setValue] = createSignal<Loadable<T>>({ state: 'idle' })
  return [value, setValue]
}

export const library = createRoot(() => {
  const [ratings, setRatings] = createSignal<Record<string, number>>({})
  const [ratingsLoaded, setRatingsLoaded] = createSignal(false)
  const [wishIds, setWishIds] = createSignal<Set<string>>(new Set())
  const [wishBooks, setWishBooks] = createSignal<Book[]>([])
  const [picks, setPicks] = loadable<Recommendation[]>()
  const [bookOfDay, setBookOfDay] = loadable<BookOfDay | null>()
  const [taste, setTaste] = loadable<Taste>()

  async function loadRatings(): Promise<void> {
    setRatings(await api.ratings())
    setRatingsLoaded(true)
  }

  async function loadWishlist(): Promise<void> {
    const data = await api.wishlist()
    setWishIds(new Set(data.bookIds))
    setWishBooks(data.books)
  }

  async function loadPicks(): Promise<void> {
    setPicks({ state: 'loading', value: picks().value })
    try {
      setPicks({ state: 'ready', value: await api.recommendations() })
    } catch {
      setPicks({ state: 'error' })
    }
  }

  async function loadBookOfDay(): Promise<void> {
    setBookOfDay({ state: 'loading', value: bookOfDay().value })
    try {
      setBookOfDay({ state: 'ready', value: await api.bookOfDay(today()) })
    } catch {
      setBookOfDay({ state: 'error' })
    }
  }

  async function loadTaste(): Promise<void> {
    setTaste({ state: 'loading', value: taste().value })
    try {
      setTaste({ state: 'ready', value: await api.taste() })
    } catch {
      setTaste({ state: 'error' })
    }
  }

  async function loadAll(): Promise<void> {
    await Promise.allSettled([loadRatings(), loadWishlist()])
  }

  function reset(): void {
    setRatings({})
    setRatingsLoaded(false)
    setWishIds(new Set<string>())
    setWishBooks([])
    setPicks({ state: 'idle' })
    setBookOfDay({ state: 'idle' })
    setTaste({ state: 'idle' })
  }

  async function rate(bookId: string, value: 1 | -1): Promise<void> {
    const before = ratings()
    const same = before[bookId] === value
    const next = { ...before }
    if (same) {
      delete next[bookId]
    } else {
      next[bookId] = value
    }
    setRatings(next)
    try {
      if (same) {
        await api.unrate(bookId)
      } else {
        await api.rate(bookId, value)
      }
      if (picks().state === 'ready') {
        void loadPicks()
      }
      if (taste().state === 'ready') {
        void loadTaste()
      }
    } catch (error) {
      setRatings(before)
      throw error
    }
  }

  async function toggleSaved(book: Book): Promise<void> {
    const beforeIds = wishIds()
    const beforeBooks = wishBooks()
    const has = beforeIds.has(book.bookId)
    const ids = new Set(beforeIds)
    if (has) {
      ids.delete(book.bookId)
      setWishBooks(beforeBooks.filter((item) => item.bookId !== book.bookId))
    } else {
      ids.add(book.bookId)
      setWishBooks([book, ...beforeBooks])
    }
    setWishIds(ids)
    try {
      await (has ? api.unsave(book.bookId) : api.save(book.bookId))
    } catch (error) {
      setWishIds(beforeIds)
      setWishBooks(beforeBooks)
      throw error
    }
  }

  return {
    ratings,
    ratingsLoaded,
    wishIds,
    wishBooks,
    picks,
    bookOfDay,
    taste,
    loadRatings,
    loadWishlist,
    loadPicks,
    loadBookOfDay,
    loadTaste,
    loadAll,
    reset,
    rate,
    toggleSaved,
  }
})
