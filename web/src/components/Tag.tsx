import type { JSX } from 'solid-js'
import { genreLabel } from '../i18n/ru.ts'

export function Tag(props: { children: JSX.Element; tone?: 'plain' | 'accent' }): JSX.Element {
  return (
    <span
      class={`label inline-flex h-7 self-start items-center rounded-full px-3 ${
        props.tone === 'accent' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-highest text-on-surface-variant'
      }`}
    >
      {props.children}
    </span>
  )
}

export function Genres(props: { genres: string[]; limit?: number }): JSX.Element {
  return (
    <ul class="flex flex-wrap gap-1.5">
      {props.genres.slice(0, props.limit ?? 3).map((genre) => (
        <li>
          <Tag>{genreLabel(genre)}</Tag>
        </li>
      ))}
    </ul>
  )
}
