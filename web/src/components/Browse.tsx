import { A } from '@solidjs/router'
import { createEffect, createSignal, on, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book } from '../api/types.ts'
import { genreLabel, interestGenres, t } from '../i18n/index.ts'
import type { CatalogSort, CatalogView } from '../lib/catalogView.ts'
import { BookCompactRow, BookTile } from './BookViews.tsx'
import { BookList, BookRow } from './BookRow.tsx'
import { Icon } from './Icon.tsx'
import { Loading } from './Loading.tsx'
import { ErrorRetry } from './Notices.tsx'

const tileTones = [
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-container text-on-tertiary-container',
] as const

export function CategoryTiles(): JSX.Element {
  return (
    <section class="flex flex-col gap-4" aria-labelledby="categories-title">
      <h2 id="categories-title" class="headline text-2xl">
        {t('categoriesLabel')}
      </h2>
      <ul class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <li class="col-span-2 md:col-span-4">
          <A
            href="/catalog"
            class="press relative flex items-center justify-between gap-4 overflow-hidden rounded-[2rem] bg-primary px-6 py-5 text-on-primary"
          >
            <md-ripple />
            <span class="headline text-2xl">{t('allBooks')}</span>
            <Icon name="menu_book" size={32} />
          </A>
        </li>
        {interestGenres.map((genre, index) => (
          <li>
            <A
              href={`/catalog/${genre}`}
              class={`press relative flex h-28 items-end overflow-hidden rounded-[2rem] p-4 ${tileTones[index % tileTones.length]}`}
            >
              <md-ripple />
              <span class="title text-lg leading-tight">{genreLabel(genre)}</span>
            </A>
          </li>
        ))}
      </ul>
    </section>
  )
}

type ListProps = { genre: string; query: string; sort: CatalogSort; view: CatalogView; trailing?: (book: Book) => JSX.Element }

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
      setTotal(0)
    }
    setBusy(true)
    setFailed(false)
    try {
      const page = await api.browse({ genre: props.genre, query: props.query, sort: props.sort, offset })
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

  createEffect(on([() => props.genre, () => props.query, () => props.sort], () => void load(true)))

  return (
    <div class="flex flex-col gap-4">
      <Show when={total() > 0}>
        <p class="label text-on-surface-variant">{t('booksCount', { count: total() })}</p>
      </Show>
      <Show when={props.view === 'list'}>
        <BookList>
          {books().map((book, index) => (
            <BookRow book={book} index={index % 24} trailing={props.trailing?.(book)} />
          ))}
        </BookList>
      </Show>
      <Show when={props.view === 'tiles'}>
        <ul class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {books().map((book, index) => (
            <BookTile book={book} index={index % 24} trailing={props.trailing?.(book)} />
          ))}
        </ul>
      </Show>
      <Show when={props.view === 'compact'}>
        <ul class="flex flex-col rounded-[1.75rem] bg-surface-low px-3 py-1">
          {books().map((book) => (
            <BookCompactRow book={book} trailing={props.trailing?.(book)} />
          ))}
        </ul>
      </Show>
      <Show when={!busy() && !failed() && total() === 0}>
        <p class="py-10 text-center text-on-surface-variant">{t('nothingFound')}</p>
      </Show>
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
