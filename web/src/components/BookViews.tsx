import { A } from '@solidjs/router'
import type { JSX } from 'solid-js'
import type { Book } from '../api/types.ts'
import { genreLabel } from '../i18n/ru.ts'
import { Cover } from './Cover.tsx'

type Props = { book: Book; trailing?: JSX.Element; index?: number }

export function BookTile(props: Props): JSX.Element {
  return (
    <li
      class="rise relative flex flex-col gap-3 rounded-[1.75rem] bg-surface-low p-3 transition-colors hover:bg-surface-container"
      style={{ 'animation-delay': `${Math.min(props.index ?? 0, 10) * 30}ms` }}
    >
      <A href={`/book/${props.book.bookId}`} class="press relative flex flex-1 flex-col gap-3 rounded-3xl p-1">
        <md-ripple />
        <Cover id={props.book.bookId} title={props.book.title} size={72} />
        <span class="flex flex-col gap-1">
          <span class="title line-clamp-2 leading-snug">{props.book.title}</span>
          <span class="line-clamp-1 text-sm text-on-surface-variant">{props.book.authors.join(', ')}</span>
          <span class="label text-on-surface-variant">{props.book.genres.slice(0, 1).map(genreLabel).join('')}</span>
        </span>
      </A>
      <div class="flex justify-end">{props.trailing}</div>
    </li>
  )
}

export function BookCompactRow(props: Props): JSX.Element {
  return (
    <li class="flex items-center gap-1 border-b border-outline-variant/50 py-1 last:border-b-0">
      <A href={`/book/${props.book.bookId}`} class="press relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1.5">
        <md-ripple />
        <Cover id={props.book.bookId} title={props.book.title} size={40} />
        <span class="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
          <span class="title line-clamp-1">{props.book.title}</span>
          <span class="line-clamp-1 text-sm text-on-surface-variant">{props.book.authors.join(', ')}</span>
        </span>
      </A>
      {props.trailing}
    </li>
  )
}
