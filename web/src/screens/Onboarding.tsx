import { useNavigate } from '@solidjs/router'
import { createResource, createSignal, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book } from '../api/types.ts'
import { BookList, BookRow } from '../components/BookRow.tsx'
import { CatalogSearch } from '../components/CatalogSearch.tsx'
import { Loading } from '../components/Loading.tsx'
import { ErrorRetry } from '../components/Notices.tsx'
import { Page } from '../components/Page.tsx'
import { Panel } from '../components/Panel.tsx'
import { Reactions } from '../components/Reactions.tsx'
import { WavyProgress } from '../components/WavyProgress.tsx'
import { genreLabel, interestGenres, lang, t } from '../i18n/index.ts'
import { ageLimit } from '../state/age.ts'
import { library } from '../state/library.ts'
import { session } from '../state/session.ts'

const TARGET = 8

function rateRow(book: Book): JSX.Element {
  return <Reactions value={library.ratings()[book.bookId]} onRate={(value) => void library.rate(book.bookId, value).catch(() => undefined)} />
}

export function Onboarding(): JSX.Element {
  const navigate = useNavigate()
  const [interests, setInterests] = createSignal<string[]>([])
  const [busy, setBusy] = createSignal(false)
  const [failed, setFailed] = createSignal(false)
  const [popular, { refetch }] = createResource(() => [interests(), lang(), ageLimit()] as const, ([list]) => api.popular(list, 16))

  const rated = () => Object.keys(library.ratings()).length

  function toggle(genre: string): void {
    setInterests((list) => (list.includes(genre) ? list.filter((item) => item !== genre) : [...list, genre]))
  }

  async function finish(): Promise<void> {
    if (busy()) {
      return
    }
    setBusy(true)
    setFailed(false)
    try {
      await api.saveProfile(interests(), true)
      session.reloadProfile()
      navigate('/', { replace: true })
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="mx-auto max-w-3xl pb-40">
      <Page title={t('interestsTitle')} subtitle={t('onboardingSubtitle')}>
        <ul class="flex flex-wrap gap-2" aria-label={t('interestsTitle')}>
          {interestGenres.map((genre) => (
            <li>
              <md-filter-chip label={genreLabel(genre)} prop:selected={interests().includes(genre)} on:click={() => toggle(genre)} />
            </li>
          ))}
        </ul>
        <p class="text-sm text-on-surface-variant">{t('consentNote')}</p>

        <h2 class="headline mt-4 text-3xl">{t('alreadyReadTitle')}</h2>
        <p class="-mt-3 text-on-surface-variant">{t('alreadyReadHint')}</p>
        <CatalogSearch trailing={rateRow}>
          <Show when={!popular.error} fallback={<ErrorRetry onRetry={() => void refetch()} />}>
            <Show when={popular()} fallback={<Loading class="py-10" />}>
              {(books) => (
                <BookList>
                  {books().map((book, index) => (
                    <BookRow book={book} index={index} trailing={rateRow(book)} />
                  ))}
                </BookList>
              )}
            </Show>
          </Show>
        </CatalogSearch>
      </Page>

      <div class="fixed inset-x-0 bottom-4 z-30 mx-auto w-[min(44rem,calc(100vw-24px))]">
        <Panel tone="secondary" class="flex flex-col gap-3 rounded-card! p-4 shadow-[0_8px_30px_-6px_rgb(0_0_0/0.28)]">
          <div class="flex items-center justify-between gap-3">
            <span class="title">{t('accuracyTitle')}</span>
            <span class="label">{t('ratedProgress', { count: Math.min(rated(), TARGET), total: TARGET })}</span>
          </div>
          <WavyProgress value={rated() / TARGET} label={t('accuracyTitle')} />
          <Show when={failed()}>
            <p role="alert" class="text-sm text-error">
              {t('loadError')}
            </p>
          </Show>
          <div class="flex justify-end gap-2">
            <md-text-button prop:disabled={busy()} on:click={() => void finish()}>
              {t('skip')}
            </md-text-button>
            <md-filled-button prop:disabled={busy()} on:click={() => void finish()}>
              {t('showPicks')}
            </md-filled-button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
