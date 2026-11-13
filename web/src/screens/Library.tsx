import { createResource, createSignal, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book, ShelfStatus } from '../api/types.ts'
import { BackButton } from '../components/BackButton.tsx'
import { BookList, BookRow } from '../components/BookRow.tsx'
import { Icon } from '../components/Icon.tsx'
import { Loading } from '../components/Loading.tsx'
import { AccountRequired, ErrorRetry } from '../components/Notices.tsx'
import { Page } from '../components/Page.tsx'
import { Reactions } from '../components/Reactions.tsx'
import { ShelfChips } from '../components/ShelfChips.tsx'
import { lang, t, type Key } from '../i18n/index.ts'
import { library } from '../state/library.ts'
import { session } from '../state/session.ts'

type Tab = ShelfStatus | 'liked' | 'disliked'

const tabs: { key: Tab; label: Key }[] = [
  { key: 'want', label: 'shelfWant' },
  { key: 'reading', label: 'shelfReading' },
  { key: 'read', label: 'shelfRead' },
  { key: 'liked', label: 'libraryTabLiked' },
  { key: 'disliked', label: 'libraryTabDisliked' },
]

function ShelfList(props: { status: ShelfStatus }): JSX.Element {
  const books = () => library.shelf().filter((entry) => entry.status === props.status).map((entry) => entry.book)
  return (
    <Show when={books().length > 0} fallback={<p class="py-6 text-on-surface-variant">{t('libraryEmpty')}</p>}>
      <p class="label text-on-surface-variant">{t('libraryCount', { count: books().length })}</p>
      <BookList>
        {books().map((book, index) => (
          <BookRow
            book={book}
            index={index}
            note={<ShelfChips book={book} />}
            trailing={
              <md-icon-button aria-label={t('libraryRemoveFromShelf')} on:click={() => void library.setStatus(book, null).catch(() => undefined)}>
                <Icon name="close" />
              </md-icon-button>
            }
          />
        ))}
      </BookList>
    </Show>
  )
}

function RatedList(props: { value: 1 | -1 }): JSX.Element {
  const [items, { refetch }] = createResource(
    () => [lang(), JSON.stringify(library.ratings())] as const,
    () => api.ratedBooks(),
  )
  const books = (): Book[] => (items() ?? []).filter((item) => item.value === props.value && library.ratings()[item.book.bookId] === props.value).map((item) => item.book)
  return (
    <Show when={!items.error} fallback={<ErrorRetry onRetry={() => void refetch()} />}>
      <Show when={items()} fallback={<Loading class="py-10" />}>
        <Show when={books().length > 0} fallback={<p class="py-6 text-on-surface-variant">{t('libraryEmpty')}</p>}>
          <p class="label text-on-surface-variant">{t('libraryCount', { count: books().length })}</p>
          <BookList>
            {books().map((book, index) => (
              <BookRow
                book={book}
                index={index}
                trailing={<Reactions value={library.ratings()[book.bookId]} onRate={(value) => void library.rate(book.bookId, value).catch(() => undefined)} />}
              />
            ))}
          </BookList>
        </Show>
      </Show>
    </Show>
  )
}

export function Library(): JSX.Element {
  const [tab, setTab] = createSignal<Tab>('want')
  return (
    <Page title={t('libraryTitle')} back={<BackButton />}>
      <Show when={session.registered()} fallback={<AccountRequired text={t('guestBookHint')} />}>
        <ul class="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:flex-wrap md:px-0" role="tablist">
          {tabs.map((item) => (
            <li class="shrink-0">
              <md-filter-chip label={t(item.label)} prop:selected={tab() === item.key} on:click={() => setTab(item.key)} />
            </li>
          ))}
        </ul>
        <Show when={tab() === 'liked' || tab() === 'disliked'} fallback={<ShelfList status={tab() as ShelfStatus} />}>
          <RatedList value={tab() === 'liked' ? 1 : -1} />
        </Show>
      </Show>
    </Page>
  )
}
