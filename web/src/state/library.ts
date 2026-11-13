import { createRoot, createSignal } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book, BookOfDay, Recommendation, ShelfEntry, ShelfStatus, Taste } from '../api/types.ts'
import { today } from '../lib/redirect.ts'

export type Loadable<T> = { state: 'idle' | 'loading' | 'ready' | 'error'; value?: T }

function loadable<T>(): [() => Loadable<T>, (next: Loadable<T>) => void] {
  const [value, setValue] = createSignal<Loadable<T>>({ state: 'idle' })
  return [value, setValue]
}

export const library = createRoot(() => {
  const [ratings, setRatings] = createSignal<Record<string, number>>({})
  const [ratingsLoaded, setRatingsLoaded] = createSignal(false)
  const [shelf, setShelf] = createSignal<ShelfEntry[]>([])
  const [picks, setPicks] = loadable<Recommendation[]>()
  const [bookOfDay, setBookOfDay] = loadable<BookOfDay | null>()
  const [taste, setTaste] = loadable<Taste>()

  async function loadRatings(): Promise<void> {
    setRatings(await api.ratings())
    setRatingsLoaded(true)
  }

  const statusOf = (bookId: string): ShelfStatus | undefined => shelf().find((entry) => entry.book.bookId === bookId)?.status
  const wishIds = (): Set<string> => new Set(shelf().filter((entry) => entry.status === 'want').map((entry) => entry.book.bookId))
  const wishBooks = (): Book[] => shelf().filter((entry) => entry.status === 'want').map((entry) => entry.book)

  async function loadShelf(): Promise<void> {
    setShelf(await api.shelf())
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
    await Promise.allSettled([loadRatings(), loadShelf()])
  }

  function refreshContent(): void {
    setPicks({ state: 'idle' })
    setBookOfDay({ state: 'idle' })
    void loadShelf().catch(() => undefined)
  }

  function reset(): void {
    setRatings({})
    setRatingsLoaded(false)
    setShelf([])
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

  async function setStatus(book: Book, status: ShelfStatus | null): Promise<void> {
    const before = shelf()
    const rest = before.filter((entry) => entry.book.bookId !== book.bookId)
    setShelf(status === null ? rest : [{ book, status, updatedAt: new Date().toISOString() }, ...rest])
    try {
      await (status === null ? api.clearShelf(book.bookId) : api.setShelf(book.bookId, status))
    } catch (error) {
      setShelf(before)
      throw error
    }
  }

  async function toggleSaved(book: Book): Promise<void> {
    await setStatus(book, statusOf(book.bookId) === 'want' ? null : 'want')
  }

  return {
    ratings,
    ratingsLoaded,
    shelf,
    statusOf,
    wishIds,
    wishBooks,
    picks,
    bookOfDay,
    taste,
    loadRatings,
    loadShelf,
    loadPicks,
    loadBookOfDay,
    loadTaste,
    loadAll,
    reset,
    refreshContent,
    rate,
    setStatus,
    toggleSaved,
  }
})
