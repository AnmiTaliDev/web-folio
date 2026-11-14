import { A } from '@solidjs/router'
import { Show, type JSX } from 'solid-js'
import type { BookOfDay } from '../api/types.ts'
import { t } from '../i18n/index.ts'
import { Cover } from './Cover.tsx'
import { Icon } from './Icon.tsx'
import { Numeral } from './Numeral.tsx'
import { Genres, Tag } from './Tag.tsx'

type Props = { data: BookOfDay; popular: boolean; saved: boolean; onToggleSaved: () => void }

export function BookOfDayCard(props: Props): JSX.Element {
  return (
    <section class="rise relative isolate overflow-hidden rounded-hero bg-primary-container p-6 text-on-primary-container md:p-10">
      <div
        aria-hidden="true"
        class="spin-slow absolute -top-16 -right-16 -z-10 size-72 bg-primary/15"
        style={{ 'clip-path': 'url(#clip-flower)' }}
      />
      <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div class="flex min-w-0 flex-col gap-4">
          <div class="flex items-center gap-2">
            <span class="label tracking-wider uppercase">{t('bookOfDay')}</span>
            <Show when={props.popular}>
              <Tag tone="accent">{t('popularBadge')}</Tag>
            </Show>
          </div>
          <div class="flex items-center gap-4">
            <Cover id={props.data.book.bookId} title={props.data.book.title} authors={props.data.book.authors} size={96} shape="portrait" showText />
            <div class="flex min-w-0 flex-col gap-1">
              <h2 class="headline text-[clamp(1.5rem,5vw,2.25rem)] text-balance">{props.data.book.title}</h2>
              <p class="opacity-85">{props.data.book.authors.join(', ')}</p>
            </div>
          </div>
          <Genres genres={props.data.book.genres} />
          <Show when={props.data.description}>
            <p class="line-clamp-3 max-w-prose opacity-90">{props.data.description}</p>
          </Show>
        </div>
        <Show when={!props.popular}>
          <Numeral value={Math.round(props.data.score * 100)} unit="%" caption={t('matchLabel')} class="shrink-0 md:items-end" />
        </Show>
      </div>
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <A href={`/book/${props.data.book.bookId}`} class="contents">
          <md-filled-button>{t('whyForMe')}</md-filled-button>
        </A>
        <md-filled-tonal-button on:click={() => props.onToggleSaved()}>
          <Icon slot="icon" name="bookmark" filled={props.saved} />
          {props.saved ? t('saved') : t('save')}
        </md-filled-tonal-button>
      </div>
    </section>
  )
}
