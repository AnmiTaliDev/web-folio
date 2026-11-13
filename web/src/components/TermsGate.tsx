import { A, useLocation, useNavigate } from '@solidjs/router'
import { createSignal, Show, type JSX } from 'solid-js'
import { t } from '../i18n/index.ts'
import { session } from '../state/session.ts'
import { Dialog } from './Dialog.tsx'
import { signOut } from './AccountCard.tsx'

export function TermsGate(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [failed, setFailed] = createSignal(false)
  const open = () => session.registered() && session.needsTerms() && !location.pathname.startsWith('/terms')

  async function accept(): Promise<void> {
    setFailed(false)
    try {
      await session.acceptTerms()
    } catch {
      setFailed(true)
    }
  }

  return (
    <Dialog
      open={open()}
      dismissable={false}
      title={t('termsUpdatedTitle')}
      onClose={() => undefined}
      actions={
        <>
          <md-text-button on:click={() => void signOut(navigate)}>{t('signOut')}</md-text-button>
          <A href="/terms" class="contents">
            <md-text-button>{t('legalTermsRead')}</md-text-button>
          </A>
          <md-filled-button on:click={() => void accept()}>{t('termsAcceptButton')}</md-filled-button>
        </>
      }
    >
      <p>{t('termsUpdatedBody')}</p>
      <Show when={failed()}>
        <p role="alert" class="mt-3 text-error">
          {t('termsAcceptFailed')}
        </p>
      </Show>
    </Dialog>
  )
}
