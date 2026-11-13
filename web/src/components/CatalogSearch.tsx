import { createEffect, createSignal, onCleanup, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import type { Book } from '../api/types.ts'
import { lang, t } from '../i18n/index.ts'
import { ageLimit } from '../state/age.ts'
import { BookList, BookRow } from './BookRow.tsx'
import { Icon } from './Icon.tsx'
import { Loading } from './Loading.tsx'

type Props = {
  trailing?: (book: Book) => JSX.Element
  children: JSX.Element
}

export function CatalogSearch(props: Props): JSX.Element {
  const [query, setQuery] = createSignal('')
  const [results, setResults] = createSignal<Book[] | null>(null)
  const [busy, setBusy] = createSignal(false)

  createEffect(() => {
    lang()
    ageLimit()
    const text = query().trim()
    if (text.length < 2) {
      setResults(null)
      setBusy(false)
      return
    }
    const controller = new AbortController()
    setBusy(true)
    const timer = setTimeout(async () => {
      try {
        setResults(await api.search(text, controller.signal))
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setBusy(false)
        }
      }
    }, 260)
    onCleanup(() => {
      clearTimeout(timer)
      controller.abort()
    })
  })

  return (
    <div class="flex flex-col gap-6">
      <div class="sticky top-0 z-10 -mx-4 bg-surface px-4 py-3 md:-mx-8 md:px-8">
        <md-filled-text-field
          class="pill-field"
          type="search"
          placeholder={t('searchHint')}
          aria-label={t('searchHint')}
          prop:value={query()}
          on:input={(event: Event) => setQuery((event.target as HTMLInputElement).value)}
        >
          <Icon slot="leading-icon" name="search" />
          <Show when={query() !== ''}>
            <md-icon-button slot="trailing-icon" aria-label={t('close')} on:click={() => setQuery('')}>
              <Icon name="close" />
            </md-icon-button>
          </Show>
        </md-filled-text-field>
      </div>
      <Show when={results() !== null || busy()} fallback={props.children}>
        <Show when={!busy() || results() !== null} fallback={<Loading class="py-10" />}>
          <Show
            when={(results() ?? []).length > 0}
            fallback={<p class="py-10 text-center text-on-surface-variant">{t('notFound')}</p>}
          >
            <BookList>
              {(results() ?? []).map((book, index) => (
                <BookRow book={book} index={index} trailing={props.trailing?.(book)} />
              ))}
            </BookList>
          </Show>
        </Show>
      </Show>
    </div>
  )
}
