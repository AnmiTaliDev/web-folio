import { createEffect, createSignal, on, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book } from '../api/types.ts'
import { genreLabel, interestGenres, t } from '../i18n/ru.ts'
import { BookList, BookRow } from './BookRow.tsx'
import { Loading } from './Loading.tsx'
import { ErrorRetry } from './Notices.tsx'

export type View = 'home' | 'all' | (typeof interestGenres)[number]

type ChipsProps = { view: View; homeLabel: string; onChange: (view: View) => void }

export function CategoryChips(props: ChipsProps): JSX.Element {
  const options: { key: View; label: string }[] = [
    { key: 'home', label: props.homeLabel },
    { key: 'all', label: t('allBooks') },
    ...interestGenres.map((genre) => ({ key: genre as View, label: genreLabel(genre) })),
  ]
  return (
    <ul class="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:flex-wrap md:px-0" aria-label={t('categoriesLabel')}>
      {options.map((option) => (
        <li class="shrink-0">
          <md-filter-chip label={option.label} prop:selected={props.view === option.key} on:click={() => props.onChange(option.key)} />
        </li>
      ))}
    </ul>
  )
}

type ListProps = { view: Exclude<View, 'home'>; trailing?: (book: Book) => JSX.Element; hidden?: (book: Book) => boolean }

export function BrowseList(props: ListProps): JSX.Element {
  const [books, setBooks] = createSignal<Book[]>([])
  const [total, setTotal] = createSignal(0)
  const [busy, setBusy] = createSignal(false)
  const [failed, setFailed] = createSignal(false)
  let token = 0

  async function load(reset: boolean): Promise<void> {
    const current = ++token
    const offset = reset ? 0 : books().length
    if (reset) {
      setBooks([])
    }
    setBusy(true)
    setFailed(false)
    try {
      const page = await api.browse(props.view === 'all' ? '' : props.view, offset)
      if (current !== token) {
        return
      }
      setTotal(page.total)
      setBooks(reset ? page.books : [...books(), ...page.books])
    } catch {
      if (current === token) {
        setFailed(true)
      }
    } finally {
      if (current === token) {
        setBusy(false)
      }
    }
  }

  createEffect(on(() => props.view, () => void load(true)))

  return (
    <div class="flex flex-col gap-4">
      <Show when={total() > 0}>
        <p class="label text-on-surface-variant">{t('booksCount', { count: total() })}</p>
      </Show>
      <BookList>
        {books()
          .filter((book) => !props.hidden?.(book))
          .map((book, index) => (
            <BookRow book={book} index={index % 20} trailing={props.trailing?.(book)} />
          ))}
      </BookList>
      <Show when={failed()}>
        <ErrorRetry onRetry={() => void load(books().length === 0)} />
      </Show>
      <Show when={busy()}>
        <Loading class="py-6" size={44} />
      </Show>
      <Show when={!busy() && !failed() && books().length < total()}>
        <md-filled-tonal-button class="self-center" on:click={() => void load(false)}>
          {t('showMore')}
        </md-filled-tonal-button>
      </Show>
    </div>
  )
}
