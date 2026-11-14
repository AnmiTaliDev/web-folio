import { A } from '@solidjs/router'
import { createEffect, Show, type JSX } from 'solid-js'
import { AccountCard } from '../components/AccountCard.tsx'
import { Loading } from '../components/Loading.tsx'
import { ErrorRetry, PrivateCard } from '../components/Notices.tsx'
import { Numeral } from '../components/Numeral.tsx'
import { Page } from '../components/Page.tsx'
import { Panel } from '../components/Panel.tsx'
import { Tag } from '../components/Tag.tsx'
import { genreLabel, t } from '../i18n/index.ts'
import { library } from '../state/library.ts'
import { session } from '../state/session.ts'

function Taste(): JSX.Element {
  createEffect(() => {
    if (library.taste().state === 'idle') {
      void library.loadTaste()
    }
  })
  return (
    <Show when={library.taste().state !== 'error'} fallback={<ErrorRetry onRetry={() => void library.loadTaste()} />}>
      <Show when={library.taste().value} fallback={<Loading class="py-10" />}>
        {(taste) => (
          <section class="flex flex-col gap-3">
            <h2 class="headline text-2xl">{t('algoThinks')}</h2>
            <div class="grid grid-cols-2 gap-3">
              <Panel tone="secondary" class="rounded-hero! p-5 md:p-8">
                <Numeral value={taste().readCount} caption={t('statsRead')} />
              </Panel>
              <Panel tone="tertiary" class="rounded-hero! p-5 md:p-8">
                <Numeral value={taste().likedCount} caption={t('statsLiked')} />
              </Panel>
            </div>
            <Show when={taste().topGenres.length > 0} fallback={<p class="text-on-surface-variant">{t('noTasteYet')}</p>}>
              <Panel tone="primary" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                  <span class="label opacity-80">{t('mainGenre')}</span>
                  <span class="display text-4xl">{genreLabel(taste().topGenres[0] ?? '')}</span>
                </div>
                <Show when={taste().topGenres.length > 1}>
                  <div class="flex flex-col gap-2">
                    <span class="label opacity-80">{t('extraGenres')}</span>
                    <ul class="flex flex-wrap gap-2">
                      {taste()
                        .topGenres.slice(1)
                        .map((genre) => (
                          <li>
                            <Tag>{genreLabel(genre)}</Tag>
                          </li>
                        ))}
                    </ul>
                  </div>
                </Show>
              </Panel>
            </Show>
          </section>
        )}
      </Show>
    </Show>
  )
}

function LibraryCard(): JSX.Element {
  const count = (status: string) => library.shelf().filter((entry) => entry.status === status).length
  const rated = (value: number) => Object.values(library.ratings()).filter((item) => item === value).length
  const rows = (): [string, number][] => [
    [t('shelfWant'), count('want')],
    [t('shelfReading'), count('reading')],
    [t('shelfRead'), count('read')],
    [t('libraryTabLiked'), rated(1)],
    [t('libraryTabDisliked'), rated(-1)],
  ]
  return (
    <section class="flex flex-col gap-3">
      <h2 class="headline text-2xl">{t('libraryTitle')}</h2>
      <Panel tone="low" class="flex flex-col gap-4">
        <ul class="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
          {rows().map(([label, value]) => (
            <li class="flex flex-col">
              <span class="headline text-3xl">{value}</span>
              <span class="label text-on-surface-variant">{label}</span>
            </li>
          ))}
        </ul>
        <div>
          <A href="/library" class="contents">
            <md-filled-tonal-button>{t('libraryOpen')}</md-filled-tonal-button>
          </A>
        </div>
      </Panel>
    </section>
  )
}

export function Profile(): JSX.Element {
  return (
    <Page title={t('profileTitle')}>
      <AccountCard settingsLink />
      <Show when={session.registered()} fallback={<PrivateCard />}>
        <Taste />
        <LibraryCard />
      </Show>
    </Page>
  )
}
