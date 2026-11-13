import { A, useLocation, useNavigate } from '@solidjs/router'
import { Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import { t } from '../i18n/index.ts'
import { chat } from '../state/chat.ts'
import { library } from '../state/library.ts'
import { session, signedOut } from '../state/session.ts'
import { Icon } from './Icon.tsx'
import { Panel } from './Panel.tsx'

export async function signOut(navigate: (path: string) => void): Promise<void> {
  try {
    await api.logout()
  } finally {
    signedOut()
    library.reset()
    chat.reset()
    navigate('/')
  }
}

export function AccountCard(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <Panel tone="container" class="flex flex-col gap-4">
      <div class="flex items-center gap-4">
        <div class="grid size-14 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
          <Icon name="person" filled />
        </div>
        <div class="flex min-w-0 flex-col">
          <h2 class="title text-lg">{t('accountTitle')}</h2>
          <p class="text-sm break-words text-on-surface-variant">
            {session.registered() ? t('accountSignedIn', { username: session.username() ?? '' }) : t('accountGuest')}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <Show
          when={session.registered()}
          fallback={
            <A href={`/auth?from=${encodeURIComponent(location.pathname)}`} class="contents">
              <md-filled-button>{t('createAccount')}</md-filled-button>
            </A>
          }
        >
          <md-filled-tonal-button on:click={() => void signOut(navigate)}>
            <Icon slot="icon" name="logout" size={18} />
            {t('signOut')}
          </md-filled-tonal-button>
        </Show>
      </div>
    </Panel>
  )
}
