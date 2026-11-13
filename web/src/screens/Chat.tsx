import { createEffect, createSignal, Show, type JSX } from 'solid-js'
import type { Book } from '../api/types.ts'
import { Cover } from '../components/Cover.tsx'
import { Icon } from '../components/Icon.tsx'
import { AccountRequired } from '../components/Notices.tsx'
import { Page } from '../components/Page.tsx'
import { Panel } from '../components/Panel.tsx'
import { Genres } from '../components/Tag.tsx'
import { genreLabel, t } from '../i18n/index.ts'
import { chat, type ChatMessage } from '../state/chat.ts'
import { library } from '../state/library.ts'
import { session } from '../state/session.ts'
import { A } from '@solidjs/router'

function contextLine(message: ChatMessage): string | null {
  const context = message.context
  if (!context) {
    return null
  }
  const items = [
    ...context.interests.map(genreLabel),
    ...(context.likedCount > 0 ? [t('chatLikedCount', { count: context.likedCount })] : []),
    ...(context.dislikedCount > 0 ? [t('chatDislikedCount', { count: context.dislikedCount })] : []),
  ]
  return items.length > 0 ? t('chatTakenFromProfile', { items: items.join(', ') }) : null
}

function BookCard(props: { book: Book }): JSX.Element {
  const saved = () => library.wishIds().has(props.book.bookId)
  return (
    <li class="flex items-center gap-2 rounded-3xl bg-surface p-2 pr-1">
      <A href={`/book/${props.book.bookId}`} class="press flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1">
        <Cover id={props.book.bookId} title={props.book.title} size={48} />
        <span class="flex min-w-0 flex-col gap-1">
          <span class="title line-clamp-1">{props.book.title}</span>
          <span class="line-clamp-1 text-sm text-on-surface-variant">{props.book.authors.join(', ')}</span>
          <Genres genres={props.book.genres} limit={1} />
        </span>
      </A>
      <md-icon-button
        aria-label={saved() ? t('wishlistRemove') : t('chatAddToWishlist')}
        aria-pressed={saved()}
        on:click={() => void library.toggleSaved(props.book).catch(() => undefined)}
      >
        <Icon name="bookmark" filled={saved()} />
      </md-icon-button>
    </li>
  )
}

function Message(props: { message: ChatMessage }): JSX.Element {
  const mine = () => props.message.role === 'user'
  return (
    <li class={`rise flex ${mine() ? 'justify-end' : 'justify-start'}`}>
      <div
        class={`flex max-w-[min(34rem,88%)] flex-col gap-3 px-5 py-3.5 ${
          mine()
            ? 'rounded-[1.75rem] rounded-br-lg bg-primary text-on-primary'
            : 'rounded-[1.75rem] rounded-bl-lg bg-surface-container text-on-surface'
        }`}
      >
        <Show when={props.message.text !== '' || mine()} fallback={<span class="inline-block size-3 animate-pulse rounded-full bg-primary" />}>
          <p class="leading-relaxed whitespace-pre-wrap">{props.message.text}</p>
        </Show>
        <Show when={props.message.books.length > 0}>
          <ul class="flex flex-col gap-2">{props.message.books.map((book) => <BookCard book={book} />)}</ul>
        </Show>
        <Show when={contextLine(props.message)}>
          <p class="label text-on-surface-variant">{contextLine(props.message)}</p>
        </Show>
      </div>
    </li>
  )
}

const suggestions = () => [t('chatSuggestEasier'), t('chatSuggestOtherAuthors'), t('chatSuggestShorter')]

export function Chat(): JSX.Element {
  const [draft, setDraft] = createSignal('')
  let end: HTMLDivElement | undefined

  createEffect(() => {
    chat.messages()
    end?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })

  async function send(text: string): Promise<void> {
    setDraft('')
    await chat.send(text)
  }

  const failureText = () => {
    switch (chat.failure()) {
      case 'unavailable':
        return t('chatErrorUnavailable')
      case 'limit':
        return t('chatErrorLimit')
      case 'generic':
        return t('chatErrorGeneric')
      default:
        return null
    }
  }

  return (
    <Page title={t('chatTitle')} subtitle={t('chatSubtitle')}>
      <Show when={session.registered()} fallback={<AccountRequired text={t('chatNeedsAccount')} />}>
        <Show when={!session.aiEnabled()}>
          <Panel tone="error" role="alert" class="flex items-center gap-3 rounded-3xl! p-4">
            <Icon name="info" />
            <span>{t('chatUnavailableBanner')}</span>
          </Panel>
        </Show>
        <Show when={chat.messages().length > 0} fallback={<p class="max-w-prose text-lg text-on-surface-variant">{t('chatEmpty')}</p>}>
          <ul class="flex flex-col gap-4" aria-live="polite">
            {chat.messages().map((message) => (
              <Message message={message} />
            ))}
          </ul>
        </Show>
        <Show when={failureText()}>
          <p role="alert" class="rounded-3xl bg-error-container px-5 py-3 text-on-error-container">
            {failureText()}
          </p>
        </Show>
        <div ref={end} />
        <div class="sticky bottom-24 z-10 flex flex-col gap-3 md:bottom-4">
          <ul class="scrollbar-none flex gap-2 overflow-x-auto" aria-label={t('suggestionsLabel')}>
            {suggestions().map((text) => (
              <li class="shrink-0">
                <md-suggestion-chip label={text} prop:disabled={chat.busy() || !session.aiEnabled()} on:click={() => void send(text)} />
              </li>
            ))}
          </ul>
          <div class="flex items-center gap-2 rounded-full bg-surface-high p-1.5 pl-2 shadow-[0_8px_30px_-6px_rgb(0_0_0/0.22)]">
            <md-filled-text-field
              class="[--md-filled-text-field-container-color:transparent] [--md-filled-text-field-container-shape:999px] [--md-filled-text-field-active-indicator-color:transparent] [--md-filled-text-field-focus-active-indicator-color:transparent] [--md-filled-text-field-hover-active-indicator-color:transparent]"
              placeholder={t('chatHint')}
              aria-label={t('chatHint')}
              prop:value={draft()}
              prop:disabled={!session.aiEnabled()}
              on:input={(event: Event) => setDraft((event.target as HTMLInputElement).value)}
              on:keydown={(event: KeyboardEvent) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send(draft())
                }
              }}
            />
            <md-filled-icon-button
              aria-label={t('chatSend')}
              prop:disabled={chat.busy() || draft().trim() === '' || !session.aiEnabled()}
              on:click={() => void send(draft())}
            >
              <Icon name="send" />
            </md-filled-icon-button>
          </div>
          <p class="label text-center text-on-surface-variant">{t('chatDisclaimer')}</p>
        </div>
      </Show>
    </Page>
  )
}
