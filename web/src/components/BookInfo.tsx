import { A } from '@solidjs/router'
import { createResource, For, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book } from '../api/types.ts'
import { lang, t, type Key } from '../i18n/index.ts'
import { ageLimit } from '../state/age.ts'
import { BookList, BookRow } from './BookRow.tsx'

const difficultyKeys = { easy: 'difficultyEasy', medium: 'difficultyMedium', hard: 'difficultyHard' } as const
const lengthKeys = { short: 'lengthShort', medium: 'lengthMedium', long: 'lengthLong', epic: 'lengthEpic' } as const

export function themeLabel(theme: string): string {
  return t(`theme_${theme}` as Key)
}

export function yearLabel(year: number): string {
  return year < 0 ? t('yearBce', { year: Math.abs(year) }) : String(year)
}

function Fact(props: { label: Key; children: JSX.Element }): JSX.Element {
  return (
    <div class="flex flex-col gap-0.5 rounded-2xl bg-surface-container px-4 py-3">
      <dt class="label text-on-surface-variant">{t(props.label)}</dt>
      <dd class="title">{props.children}</dd>
    </div>
  )
}

export function BookInfo(props: { book: Book }): JSX.Element {
  const facts = () => ({
    year: props.book.year,
    difficulty: props.book.difficulty ?? null,
    length: props.book.length ?? null,
  })
  const [similar] = createResource(
    () => [props.book.bookId, lang(), ageLimit()] as const,
    ([id]) => api.similar(id),
  )
  return (
    <div class="flex flex-col gap-8">
      <Show when={props.book.overview}>
        <section class="flex flex-col gap-3" aria-labelledby="about-title">
          <h2 id="about-title" class="headline text-2xl">
            {t('bookAbout')}
          </h2>
          <p class="max-w-prose text-lg leading-relaxed">{props.book.overview}</p>
        </section>
      </Show>
      <Show when={facts().year != null || facts().difficulty || facts().length}>
        <dl class="grid gap-2 sm:grid-cols-3">
          <Show when={facts().year != null}>
            <Fact label="factYear">{yearLabel(facts().year ?? 0)}</Fact>
          </Show>
          <Show when={facts().difficulty}>{(value) => <Fact label="factDifficulty">{t(difficultyKeys[value()])}</Fact>}</Show>
          <Show when={facts().length}>{(value) => <Fact label="factLength">{t(lengthKeys[value()])}</Fact>}</Show>
        </dl>
      </Show>
      <Show when={(props.book.themes ?? []).length > 0}>
        <section class="flex flex-col gap-3">
          <h2 class="headline text-2xl">{t('themesTitle')}</h2>
          <ul class="flex flex-wrap gap-2">
            <For each={props.book.themes ?? []}>
              {(theme) => (
                <li>
                  <A
                    href={`/catalog?theme=${theme}`}
                    class="press label inline-flex h-9 items-center rounded-xl bg-secondary-container px-4 text-on-secondary-container"
                  >
                    {themeLabel(theme)}
                  </A>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
      <Show when={(similar() ?? []).length > 0}>
        <section class="flex flex-col gap-3">
          <h2 class="headline text-2xl">{t('similarTitle')}</h2>
          <BookList>
            <For each={similar() ?? []}>{(book, index) => <BookRow book={book} index={index()} />}</For>
          </BookList>
        </section>
      </Show>
    </div>
  )
}
