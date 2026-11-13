import { createEffect, createResource, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book } from '../api/types.ts'
import { BookList, BookRow } from '../components/BookRow.tsx'
import { BookOfDayCard } from '../components/BookOfDayCard.tsx'
import { CatalogSearch } from '../components/CatalogSearch.tsx'
import { Loading } from '../components/Loading.tsx'
import { AccountPrompt, ErrorRetry, PrivateBadge, PrivateCard } from '../components/Notices.tsx'
import { Page } from '../components/Page.tsx'
import { Reactions } from '../components/Reactions.tsx'
import { t } from '../i18n/ru.ts'
import { library } from '../state/library.ts'
import { session } from '../state/session.ts'

function rateRow(book: Book): JSX.Element {
  return <Reactions value={library.ratings()[book.bookId]} onRate={(value) => void library.rate(book.bookId, value).catch(() => undefined)} />
}

function GuestHome(): JSX.Element {
  const [popular, { refetch }] = createResource(() => api.popular())
  return (
    <Page title={t('guestCatalogTitle')} trailing={<PrivateBadge />}>
      <CatalogSearch>
        <div class="flex flex-col gap-6">
          <AccountPrompt />
          <h2 class="headline text-2xl">{t('guestPopularTitle')}</h2>
          <Show when={!popular.error} fallback={<ErrorRetry onRetry={() => void refetch()} />}>
            <Show when={popular()} fallback={<Loading class="py-10" />}>
              {(books) => (
                <BookList>
                  {books().map((book, index) => (
                    <BookRow book={book} index={index} />
                  ))}
                </BookList>
              )}
            </Show>
          </Show>
          <PrivateCard />
        </div>
      </CatalogSearch>
    </Page>
  )
}

function Picks(): JSX.Element {
  createEffect(() => {
    if (library.picks().state === 'idle') {
      void library.loadPicks()
    }
    if (library.bookOfDay().state === 'idle') {
      void library.loadBookOfDay()
    }
  })

  const popular = () => (library.picks().value ?? []).some((item) => item.mode === 'popular')
  const dayId = () => library.bookOfDay().value?.book.bookId
  const visible = () =>
    (library.picks().value ?? []).filter((item) => library.ratings()[item.bookId] === undefined && item.bookId !== dayId())

  return (
    <Page title={t('recommendationsTitle')}>
      <CatalogSearch trailing={rateRow}>
        <div class="flex flex-col gap-6">
          <Show when={library.bookOfDay().value}>
            {(data) => (
              <BookOfDayCard
                data={data()}
                popular={popular()}
                saved={library.wishIds().has(data().book.bookId)}
                onToggleSaved={() => void library.toggleSaved(data().book).catch(() => undefined)}
              />
            )}
          </Show>
          <Show when={popular()}>
            <p class="rounded-3xl bg-secondary-container px-5 py-4 text-on-secondary-container">{t('popularHint')}</p>
          </Show>
          <h2 class="headline text-2xl">{t('topForYou')}</h2>
          <Show when={library.picks().state !== 'error'} fallback={<ErrorRetry onRetry={() => void library.loadPicks()} />}>
            <Show when={library.picks().value} fallback={<Loading class="py-10" />}>
              <Show when={visible().length > 0} fallback={<p class="text-on-surface-variant">{t('noPicks')}</p>}>
                <BookList>
                  {visible().map((book, index) => (
                    <BookRow book={book} index={index} trailing={rateRow(book)} />
                  ))}
                </BookList>
              </Show>
            </Show>
          </Show>
        </div>
      </CatalogSearch>
    </Page>
  )
}

export function Home(): JSX.Element {
  return (
    <Show when={session.registered()} fallback={<GuestHome />}>
      <Picks />
    </Show>
  )
}
