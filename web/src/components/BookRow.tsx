import { A } from '@solidjs/router'
import type { JSX } from 'solid-js'
import type { Book } from '../api/types.ts'
import { Cover } from './Cover.tsx'
import { Genres } from './Tag.tsx'

type Props = { book: Book; trailing?: JSX.Element; index?: number; note?: JSX.Element }

export function BookRow(props: Props): JSX.Element {
  return (
    <li
      class="rise relative flex items-center gap-2 rounded-card bg-surface-low p-3 pr-2 transition-colors hover:bg-surface-container"
      style={{ 'animation-delay': `${Math.min(props.index ?? 0, 10) * 36}ms` }}
    >
      <A href={`/book/${props.book.bookId}`} class="press relative flex min-w-0 flex-1 items-center gap-4 rounded-3xl p-1 outline-offset-2">
        <md-ripple />
        <Cover id={props.book.bookId} title={props.book.title} size={64} />
        <span class="flex min-w-0 flex-1 flex-col gap-1.5">
          <span class="title line-clamp-2 text-[1.0625rem] leading-snug">{props.book.title}</span>
          <span class="line-clamp-1 text-sm text-on-surface-variant">{props.book.authors.join(', ')}</span>
          <Genres genres={props.book.genres} limit={2} />
          {props.note}
        </span>
      </A>
      {props.trailing}
    </li>
  )
}

export function BookList(props: { children: JSX.Element; label?: string }): JSX.Element {
  return (
    <ul class="flex flex-col gap-2.5" aria-label={props.label}>
      {props.children}
    </ul>
  )
}
