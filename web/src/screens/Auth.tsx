import { A, useNavigate, useSearchParams } from '@solidjs/router'
import { createSignal, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import { Field } from '../components/Field.tsx'
import { Icon } from '../components/Icon.tsx'
import { Panel } from '../components/Panel.tsx'
import { RecoveryCodeDialog } from '../components/Dialogs.tsx'
import { t } from '../i18n/index.ts'
import { authErrorText, normalizeUsername, validateAuth, type Mode } from '../lib/auth.ts'
import { safeFrom } from '../lib/redirect.ts'
import { signedIn } from '../state/session.ts'

const titles: Record<Mode, () => string> = {
  register: () => t('authModeRegister'),
  login: () => t('authModeLogin'),
  recover: () => t('authModeRecover'),
}

const submits: Record<Mode, () => string> = {
  register: () => t('authSubmitRegister'),
  login: () => t('authSubmitLogin'),
  recover: () => t('authSubmitRecover'),
}

export function Auth(): JSX.Element {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = createSignal<Mode>('login')
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [code, setCode] = createSignal('')
  const [errors, setErrors] = createSignal<{ username?: string; password?: string; code?: string }>({})
  const [formError, setFormError] = createSignal<string | null>(null)
  const [accepted, setAccepted] = createSignal(false)
  const [termsError, setTermsError] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [recovery, setRecovery] = createSignal<{ code: string; username: string } | null>(null)

  const from = () => safeFrom(typeof params.from === 'string' ? params.from : null)

  function leave(): void {
    navigate(from() ?? '/', { replace: true })
  }

  async function submit(): Promise<void> {
    if (busy()) {
      return
    }
    const found = validateAuth(mode(), { username: username(), password: password(), code: code() })
    setErrors(found)
    setFormError(null)
    setTermsError(mode() === 'register' && !accepted())
    if (Object.keys(found).length > 0 || (mode() === 'register' && !accepted())) {
      return
    }
    setBusy(true)
    const name = normalizeUsername(username())
    try {
      if (mode() === 'login') {
        await api.login(name, password())
        await signedIn(name)
        leave()
      } else if (mode() === 'register') {
        const result = await api.register(name, password())
        setRecovery({ code: result.recoveryCode, username: result.username })
      } else {
        const result = await api.recover(name, code().trim(), password())
        setRecovery({ code: result.recoveryCode, username: result.username })
      }
    } catch (error) {
      setFormError(authErrorText(error))
    } finally {
      setBusy(false)
    }
  }

  async function finish(): Promise<void> {
    const done = recovery()
    setRecovery(null)
    if (done) {
      await signedIn(done.username)
      leave()
    }
  }

  return (
    <main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 py-10">
      <div class="flex flex-col gap-4">
        <A href={from() ?? '/'} aria-label={t('back')} class="contents">
          <md-icon-button aria-label={t('back')}>
            <Icon name="arrow_back" />
          </md-icon-button>
        </A>
        <div class="flex items-center gap-3">
          <span class="headline text-3xl">Folio</span>
        </div>
        <h1 class="display text-[2.75rem]">{titles[mode()]()}</h1>
        <Show when={mode() === 'register'}>
          <p class="text-on-surface-variant">{t('authRegisterHint')}</p>
        </Show>
      </div>

      <form
        class="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field label={t('authUsername')} autocomplete="username" value={username()} error={errors().username} onInput={setUsername} />
        <Show when={mode() === 'recover'}>
          <Field label={t('authRecoveryCode')} value={code()} error={errors().code} onInput={setCode} />
        </Show>
        <Field
          label={mode() === 'recover' ? t('authNewPassword') : t('authPassword')}
          type="password"
          autocomplete={mode() === 'login' ? 'current-password' : 'new-password'}
          value={password()}
          error={errors().password}
          onInput={setPassword}
          onEnter={() => void submit()}
        />
        <Show when={mode() === 'register'}>
          <label class="flex cursor-pointer items-start gap-3 py-1">
            <md-checkbox aria-label={t('authTermsLink')} prop:checked={accepted()} on:change={(event: Event) => setAccepted((event.target as HTMLInputElement).checked)} class="mt-0.5" />
            <span class="leading-snug">
              {t('authAcceptPrefix')}{' '}
              <A href="/terms" class="text-primary underline underline-offset-4" target="_blank">
                {t('authTermsLink')}
              </A>
            </span>
          </label>
          <Show when={termsError()}>
            <p role="alert" class="text-sm text-error">
              {t('authTermsRequired')}
            </p>
          </Show>
        </Show>
        <Show when={formError()}>
          <Panel tone="error" role="alert" class="rounded-2xl! p-4 text-sm">
            {formError()}
          </Panel>
        </Show>
        <md-filled-button class="big mt-2" prop:disabled={busy()} on:click={() => void submit()}>
          {submits[mode()]()}
        </md-filled-button>
      </form>

      <div class="flex flex-col items-start gap-1">
        <Show when={mode() === 'login'}>
          <md-text-button on:click={() => setMode('register')}>{t('createAccount')}</md-text-button>
          <md-text-button on:click={() => setMode('recover')}>{t('authForgot')}</md-text-button>
        </Show>
        <Show when={mode() !== 'login'}>
          <md-text-button on:click={() => setMode('login')}>{t('signIn')}</md-text-button>
        </Show>
      </div>
      <RecoveryCodeDialog code={recovery()?.code ?? null} onDone={() => void finish()} />
    </main>
  )
}
