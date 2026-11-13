import type { JSX } from 'solid-js'
import type { Book, ShelfStatus } from '../api/types.ts'
import { t, type Key } from '../i18n/index.ts'
import { library } from '../state/library.ts'

const options: { status: ShelfStatus; label: Key }[] = [
  { status: 'want', label: 'shelfWant' },
  { status: 'reading', label: 'shelfReading' },
  { status: 'read', label: 'shelfRead' },
]

export function ShelfChips(props: { book: Book }): JSX.Element {
  const current = () => library.statusOf(props.book.bookId)
  return (
    <ul class="flex flex-wrap gap-2" role="radiogroup" aria-label={t('libraryStatusLabel')}>
      {options.map((option) => (
        <li>
          <md-filter-chip
            label={t(option.label)}
            prop:selected={current() === option.status}
            on:click={() => void library.setStatus(props.book, current() === option.status ? null : option.status).catch(() => undefined)}
          />
        </li>
      ))}
    </ul>
  )
}
