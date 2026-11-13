import { useParams } from '@solidjs/router'
import { createResource, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book } from '../api/types.ts'
import { BackButton } from '../components/BackButton.tsx'
import { Cover } from '../components/Cover.tsx'
import { Icon } from '../components/Icon.tsx'
import { Loading } from '../components/Loading.tsx'
import { AccountRequired, ErrorRetry } from '../components/Notices.tsx'
import { Numeral } from '../components/Numeral.tsx'
import { Panel } from '../components/Panel.tsx'
import { Genres, Tag } from '../components/Tag.tsx'
import { WavyProgress } from '../components/WavyProgress.tsx'
import { reasonText, t } from '../i18n/ru.ts'
import { library } from '../state/library.ts'
import { session } from '../state/session.ts'

function Heading(props: { book: Book; children?: JSX.Element }): JSX.Element {
  return (
    <header class="flex flex-col gap-5 pt-4">
      <BackButton />
      <div class="flex items-center gap-5">
        <Cover id={props.book.bookId} title={props.book.title} size={104} />
        <div class="flex min-w-0 flex-col gap-2">
          <h1 class="display text-[clamp(1.75rem,6vw,3rem)] text-balance">{props.book.title}</h1>
          <p class="text-lg text-on-surface-variant">{props.book.authors.join(', ')}</p>
        </div>
      </div>
      <Genres genres={props.book.genres} limit={5} />
      {props.children}
    </header>
  )
}

function Description(props: { text: string | null | undefined; ai: boolean }): JSX.Element {
  return (
    <section class="flex flex-col gap-2">
      <p class="max-w-prose text-lg leading-relaxed">{props.text ?? t('noDescription')}</p>
      <Show when={props.ai && props.text}>
        <p class="label text-on-surface-variant">{t('aiCaptionWarning')}</p>
      </Show>
    </section>
  )
}

function GuestBook(props: { id: string }): JSX.Element {
  const [book, { refetch }] = createResource(() => props.id, (id) => api.book(id))
  return (
    <Show when={!book.error} fallback={<ErrorRetry onRetry={() => void refetch()} />}>
      <Show when={book()} fallback={<Loading class="py-20" />}>
        {(data) => (
          <article class="flex flex-col gap-6">
            <Heading book={data()} />
            <Description text={data().description} ai={false} />
            <AccountRequired text={t('guestBookHint')} />
          </article>
        )}
      </Show>
    </Show>
  )
}

function Toolbar(props: { book: Book }): JSX.Element {
  const value = () => library.ratings()[props.book.bookId]
  const saved = () => library.wishIds().has(props.book.bookId)
  return (
    <div class="fixed inset-x-0 bottom-24 z-20 mx-auto flex w-fit items-center gap-1 rounded-full bg-inverse-surface p-1.5 text-inverse-on-surface shadow-[0_8px_30px_-6px_rgb(0_0_0/0.4)] md:bottom-8">
      <md-icon-button
        aria-label={t('like')}
        aria-pressed={value() === 1}
        style={{ '--md-icon-button-icon-color': 'currentColor' }}
        on:click={() => void library.rate(props.book.bookId, 1).catch(() => undefined)}
      >
        <Icon name="thumb_up" filled={value() === 1} />
      </md-icon-button>
      <md-icon-button
        aria-label={t('dislike')}
        aria-pressed={value() === -1}
        style={{ '--md-icon-button-icon-color': 'currentColor' }}
        on:click={() => void library.rate(props.book.bookId, -1).catch(() => undefined)}
      >
        <Icon name="thumb_down" filled={value() === -1} />
      </md-icon-button>
      <span class="mx-1 h-6 w-px bg-inverse-on-surface/30" aria-hidden="true" />
      <md-icon-button
        aria-label={saved() ? t('inWishlist') : t('wantToRead')}
        aria-pressed={saved()}
        style={{ '--md-icon-button-icon-color': 'currentColor' }}
        on:click={() => void library.toggleSaved(props.book).catch(() => undefined)}
      >
        <Icon name="bookmark" filled={saved()} />
      </md-icon-button>
    </div>
  )
}

function Why(props: { id: string }): JSX.Element {
  const [data, { refetch }] = createResource(
    () => props.id,
    async (id) => {
      const [book, explanation] = await Promise.all([api.book(id), api.explain(id)])
      return { book, explanation }
    },
  )
  const rated = (id: string) => library.ratings()[id]

  return (
    <Show when={!data.error} fallback={<ErrorRetry onRetry={() => void refetch()} />}>
      <Show when={data()} fallback={<Loading class="py-20" />}>
        {(loaded) => {
          const popular = () => loaded().explanation.mode === 'popular'
          return (
            <article class="flex flex-col gap-6 pb-24">
              <Heading book={loaded().book} />
              <Show when={rated(loaded().book.bookId) !== undefined}>
                <p class="rounded-3xl bg-secondary-container px-5 py-4 text-on-secondary-container">
                  {rated(loaded().book.bookId) === 1 ? t('alreadyLiked') : t('alreadyDisliked')}
                </p>
              </Show>
              <Show when={rated(loaded().book.bookId) === undefined}>
              <Panel tone="primary" class="flex items-end justify-between gap-4 rounded-[2.5rem]! md:p-8">
                <Show
                  when={!popular()}
                  fallback={
                    <div class="flex flex-col gap-2">
                      <Tag tone="accent">{t('popularBadge')}</Tag>
                      <p class="headline text-2xl">{t('reasonPopular')}</p>
                    </div>
                  }
                >
                  <Numeral value={Math.round(loaded().explanation.score * 100)} unit="%" caption={t('matchLabel')} />
                </Show>
              </Panel>
              <section class="flex flex-col gap-4">
                <h2 class="headline text-2xl">{t('whyListTitle')}</h2>
                <ul class="flex flex-col gap-5">
                  {loaded().explanation.reasons.map((reason) => (
                    <li class="flex flex-col gap-2">
                      <div class="flex items-baseline justify-between gap-4">
                        <span class="title">{reasonText(reason)}</span>
                        <span class="headline text-xl">{reason.percent}%</span>
                      </div>
                      <WavyProgress value={reason.percent / 100} label={reasonText(reason)} />
                    </li>
                  ))}
                </ul>
              </section>
              </Show>
              <Description
                text={loaded().explanation.description.text ?? loaded().book.description}
                ai={loaded().explanation.description.aiGenerated}
              />
              <Toolbar book={loaded().book} />
            </article>
          )
        }}
      </Show>
    </Show>
  )
}

export function BookScreen(): JSX.Element {
  const params = useParams()
  return (
    <main>
      <Show when={session.registered()} fallback={<GuestBook id={params.id ?? ''} />}>
        <Why id={params.id ?? ''} />
      </Show>
    </main>
  )
}
