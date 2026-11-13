import { useParams, useSearchParams } from '@solidjs/router'
import { createEffect, createSignal, onCleanup, Show, type JSX } from 'solid-js'
import type { Book } from '../api/types.ts'
import { BackButton } from '../components/BackButton.tsx'
import { themeLabel } from '../components/BookInfo.tsx'
import { BrowseList } from '../components/Browse.tsx'
import { Icon } from '../components/Icon.tsx'
import type { IconName } from '../components/icons.ts'
import { Page } from '../components/Page.tsx'
import { Reactions } from '../components/Reactions.tsx'
import { genreLabel, t, type Key } from '../i18n/index.ts'
import { CATALOG_SORTS, readView, writeView, type CatalogSort, type CatalogView } from '../lib/catalogView.ts'
import { library } from '../state/library.ts'
import { session } from '../state/session.ts'

function rateRow(book: Book): JSX.Element {
  return <Reactions value={library.ratings()[book.bookId]} onRate={(value) => void library.rate(book.bookId, value).catch(() => undefined)} />
}

const sortLabels: Record<CatalogSort, Key> = {
  popularity: 'sortPopularity',
  title: 'sortTitle',
  author: 'sortAuthor',
  year_desc: 'sortYearDesc',
  year_asc: 'sortYearAsc',
}

const views: { key: CatalogView; icon: IconName; label: Key }[] = [
  { key: 'list', icon: 'view_list', label: 'viewList' },
  { key: 'tiles', icon: 'grid_view', label: 'viewTiles' },
  { key: 'compact', icon: 'view_headline', label: 'viewCompact' },
]

export function Catalog(): JSX.Element {
  const params = useParams()
  const [search, setSearch] = useSearchParams()
  const theme = () => (typeof search.theme === 'string' ? search.theme : '')
  const genre = () => params.genre ?? ''
  const [draft, setDraft] = createSignal('')
  const [query, setQuery] = createSignal('')
  const [sort, setSort] = createSignal<CatalogSort>('popularity')
  const [view, setView] = createSignal<CatalogView>(readView())

  createEffect(() => {
    const text = draft().trim()
    const timer = setTimeout(() => setQuery(text), 260)
    onCleanup(() => clearTimeout(timer))
  })

  function chooseView(next: CatalogView): void {
    setView(next)
    writeView(next)
  }

  return (
    <Page title={genre() === '' ? t('allBooks') : genreLabel(genre())} back={<BackButton />}>
      <div class="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-surface px-4 py-3 md:-mx-8 md:px-8">
        <md-filled-text-field
          class="pill-field"
          type="search"
          placeholder={t('searchInCatalog')}
          aria-label={t('searchInCatalog')}
          prop:value={draft()}
          on:input={(event: Event) => setDraft((event.target as HTMLInputElement).value)}
        >
          <Icon slot="leading-icon" name="search" />
          <Show when={draft() !== ''}>
            <md-icon-button slot="trailing-icon" aria-label={t('close')} on:click={() => setDraft('')}>
              <Icon name="close" />
            </md-icon-button>
          </Show>
        </md-filled-text-field>
        <div class="flex items-center justify-between gap-3">
          <md-filled-select
            class="min-w-0 flex-1 [--md-filled-select-text-field-container-shape:999px] sm:max-w-64"
            label={t('sortLabel')}
            prop:value={sort()}
            on:change={(event: Event) => setSort((event.target as HTMLSelectElement).value as CatalogSort)}
          >
            {CATALOG_SORTS.map((option) => (
              <md-select-option value={option} prop:selected={sort() === option}>
                <div slot="headline">{t(sortLabels[option])}</div>
              </md-select-option>
            ))}
          </md-filled-select>
          <div class="flex shrink-0 items-center rounded-full bg-surface-high p-1" role="group" aria-label={t('viewLabel')}>
            {views.map((option) => (
              <md-icon-button
                aria-label={t(option.label)}
                aria-pressed={view() === option.key}
                style={view() === option.key ? { '--md-icon-button-icon-color': 'var(--color-on-secondary-container)', background: 'var(--color-secondary-container)', 'border-radius': '999px' } : {}}
                on:click={() => chooseView(option.key)}
              >
                <Icon name={option.icon} filled={view() === option.key} />
              </md-icon-button>
            ))}
          </div>
        </div>
      </div>
      <Show when={theme() !== ''}>
        <div>
          <md-input-chip label={t('themeFilter', { theme: themeLabel(theme()) })} prop:selected={true} on:remove={() => setSearch({ theme: undefined })}></md-input-chip>
        </div>
      </Show>
      <BrowseList genre={genre()} query={query()} sort={sort()} view={view()} theme={theme()} trailing={session.registered() ? rateRow : undefined} />
    </Page>
  )
}
