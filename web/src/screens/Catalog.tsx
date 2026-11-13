import { useParams } from '@solidjs/router'
import { Show, type JSX } from 'solid-js'
import type { Book } from '../api/types.ts'
import { BackButton } from '../components/BackButton.tsx'
import { BrowseList } from '../components/Browse.tsx'
import { Page } from '../components/Page.tsx'
import { Reactions } from '../components/Reactions.tsx'
import { genreLabel, t } from '../i18n/ru.ts'
import { library } from '../state/library.ts'
import { session } from '../state/session.ts'

function rateRow(book: Book): JSX.Element {
  return <Reactions value={library.ratings()[book.bookId]} onRate={(value) => void library.rate(book.bookId, value).catch(() => undefined)} />
}

export function Catalog(): JSX.Element {
  const params = useParams()
  const genre = () => params.genre ?? ''
  return (
    <Page title={genre() === '' ? t('allBooks') : genreLabel(genre())} back={<BackButton />}>
      <Show when={session.registered()} fallback={<BrowseList genre={genre()} />}>
        <BrowseList genre={genre()} trailing={rateRow} />
      </Show>
    </Page>
  )
}
