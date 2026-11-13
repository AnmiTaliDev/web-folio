import { A, useLocation } from '@solidjs/router'
import { createSignal, Show, type JSX } from 'solid-js'
import { t } from '../i18n/ru.ts'
import { Icon } from './Icon.tsx'
import { Panel } from './Panel.tsx'

export function ErrorRetry(props: { onRetry: () => void }): JSX.Element {
  return (
    <Panel tone="error" role="alert" class="flex flex-col items-start gap-4">
      <div class="flex items-center gap-3">
        <Icon name="error" />
        <span class="title">{t('loadError')}</span>
      </div>
      <md-filled-tonal-button on:click={() => props.onRetry()}>{t('retry')}</md-filled-tonal-button>
    </Panel>
  )
}

export function PrivateBadge(): JSX.Element {
  return (
    <span class="label inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary-container px-3 text-on-secondary-container">
      <Icon name="lock" size={16} />
      {t('privateModeTitle')}
    </span>
  )
}

export function PrivateCard(): JSX.Element {
  return (
    <Panel tone="secondary" class="flex items-start gap-4">
      <Icon name="lock_person" size={32} class="mt-0.5" />
      <div class="flex flex-col gap-1">
        <h2 class="title text-lg">{t('privateModeTitle')}</h2>
        <p class="text-sm opacity-90">{t('privateModeBody')}</p>
      </div>
    </Panel>
  )
}

export function AccountPrompt(): JSX.Element {
  const [hidden, setHidden] = createSignal(false)
  const location = useLocation()
  return (
    <Show when={!hidden()}>
      <Panel tone="tertiary" class="rise flex flex-col gap-4 sm:flex-row sm:items-center">
        <p class="title flex-1 text-lg leading-snug">{t('promptText')}</p>
        <div class="flex gap-2">
          <A href={`/auth?from=${encodeURIComponent(location.pathname)}`} class="contents">
            <md-filled-button>{t('createAccount')}</md-filled-button>
          </A>
          <md-text-button on:click={() => setHidden(true)}>{t('promptDismiss')}</md-text-button>
        </div>
      </Panel>
    </Show>
  )
}

export function AccountRequired(props: { text: string }): JSX.Element {
  const location = useLocation()
  return (
    <Panel tone="tertiary" class="flex flex-col items-start gap-4">
      <Icon name="lock" size={32} />
      <p class="title text-lg leading-snug">{props.text}</p>
      <A href={`/auth?from=${encodeURIComponent(location.pathname)}`} class="contents">
        <md-filled-button>{t('signIn')}</md-filled-button>
      </A>
    </Panel>
  )
}
