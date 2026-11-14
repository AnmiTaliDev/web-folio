import { useNavigate } from '@solidjs/router'
import { createResource, createSignal, For, Show, type JSX } from 'solid-js'
import { api } from '../../api/client.ts'
import { AccountCard, signOut } from '../../components/AccountCard.tsx'
import { FormDialog, RecoveryCodeDialog } from '../../components/Dialogs.tsx'
import { Icon } from '../../components/Icon.tsx'
import type { IconName } from '../../components/icons.ts'
import { PrivateCard } from '../../components/Notices.tsx'
import { Panel } from '../../components/Panel.tsx'
import { lang, t } from '../../i18n/index.ts'
import { isValidPassword, isValidUsername, normalizeUsername } from '../../lib/auth.ts'
import { describeDevice, deviceLabel, formatDate, formatDateTime } from '../../lib/device.ts'
import { chat } from '../../state/chat.ts'
import { library } from '../../state/library.ts'
import { session, signedOut } from '../../state/session.ts'
import { Group, Row } from './parts.tsx'

export function leaveAccount(navigate: (path: string) => void): void {
  signedOut()
  library.reset()
  chat.reset()
  navigate('/')
}

function AccountProfile(props: { onChangeUsername: () => void }): JSX.Element {
  const [account] = createResource(
    () => (session.registered() ? session.username() : null),
    () => api.account(),
  )
  return (
    <Panel tone="container" class="flex flex-col gap-4">
      <div class="flex items-center gap-4">
        <div class="grid size-16 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
          <Icon name="person" filled size={32} />
        </div>
        <div class="flex min-w-0 flex-col">
          <h3 class="headline text-2xl break-all">{session.username()}</h3>
          <Show when={account()}>
            {(info) => (
              <>
                <p class="text-sm text-on-surface-variant">{t('accountCreated', { date: formatDate(info().createdAt, lang()) })}</p>
                <Show when={info().termsAcceptedAt}>
                  {(accepted) => <p class="text-sm text-on-surface-variant">{t('termsAccepted', { date: formatDate(accepted(), lang()) })}</p>}
                </Show>
              </>
            )}
          </Show>
        </div>
      </div>
      <div>
        <md-filled-tonal-button on:click={() => props.onChangeUsername()}>
          <Icon slot="icon" name="edit" size={18} />
          {t('changeUsername')}
        </md-filled-tonal-button>
      </div>
    </Panel>
  )
}

function deviceIcon(kind: ReturnType<typeof describeDevice>['kind']): IconName {
  return kind === 'phone' ? 'mobile' : kind === 'tablet' ? 'tablet' : 'computer'
}

function Sessions(props: { onSignOutEverywhere: () => void }): JSX.Element {
  const [list, { refetch }] = createResource(() => api.sessions())
  const [busyId, setBusyId] = createSignal<string | null>(null)

  async function end(id: string): Promise<void> {
    setBusyId(id)
    try {
      await api.revokeSession(id)
    } finally {
      setBusyId(null)
      void refetch()
    }
  }

  return (
    <div class="flex flex-col gap-4">
      <p class="px-2 text-on-surface-variant">{t('sessionsIntro')}</p>
      <Show when={!list.error} fallback={<p role="alert" class="text-error">{t('sessionsLoadError')}</p>}>
        <ul class="flex flex-col gap-2.5">
          <For each={list() ?? []}>
            {(item) => {
              const device = describeDevice(item.userAgent)
              return (
                <li class={`flex items-center gap-4 rounded-3xl p-4 ${item.current ? 'bg-primary-container text-on-primary-container' : 'bg-surface-low'}`}>
                  <Icon name={deviceIcon(device.kind)} size={28} />
                  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="title">{deviceLabel(device, t('sessionUnknown'))}</span>
                      <Show when={item.current}>
                        <span class="label rounded-full bg-primary px-2.5 py-0.5 text-on-primary">{t('sessionCurrent')}</span>
                      </Show>
                    </div>
                    <span class="text-sm opacity-80">{t('sessionLastActive', { date: formatDateTime(item.lastSeenAt, lang()) })}</span>
                    <span class="text-sm opacity-80">{t('sessionSignedIn', { date: formatDateTime(item.createdAt, lang()) })}</span>
                  </div>
                  <Show when={!item.current}>
                    <md-text-button prop:disabled={busyId() === item.id} on:click={() => void end(item.id)}>
                      {t('sessionEnd')}
                    </md-text-button>
                  </Show>
                </li>
              )
            }}
          </For>
        </ul>
      </Show>
      <Group>
        <Row icon="logout" label={t('signOutEverywhere')} onClick={() => props.onSignOutEverywhere()} />
      </Group>
    </div>
  )
}

type Dialog = 'password' | 'recovery' | 'username' | null

export function AccountSection(): JSX.Element {
  const navigate = useNavigate()
  const [dialog, setDialog] = createSignal<Dialog>(null)
  const [newCode, setNewCode] = createSignal<string | null>(null)
  const close = () => setDialog(null)

  async function logoutEverywhere(): Promise<void> {
    try {
      await api.logoutAll()
    } finally {
      leaveAccount(navigate)
    }
  }

  return (
    <>
      <div class="flex flex-col gap-4">
        <Show when={session.registered()} fallback={<><AccountCard /><PrivateCard /></>}>
          <AccountProfile onChangeUsername={() => setDialog('username')} />
          <h3 class="headline mt-2 px-2 text-2xl">{t('accountSecurity')}</h3>
          <Group>
            <Row icon="key" label={t('changePassword')} onClick={() => setDialog('password')} />
            <Row icon="shield" label={t('newRecoveryCode')} onClick={() => setDialog('recovery')} />
          </Group>
          <h3 class="headline mt-2 px-2 text-2xl">{t('settingsSessions')}</h3>
          <Sessions onSignOutEverywhere={() => void logoutEverywhere()} />
          <Group>
            <Row icon="logout" label={t('signOut')} onClick={() => void signOut(navigate)} />
          </Group>
        </Show>
      </div>
      <FormDialog
        open={dialog() === 'username'}
        title={t('changeUsername')}
        body={t('changeUsernameBody')}
        fields={[
          { key: 'username', label: t('newUsername'), autocomplete: 'username', type: 'text' },
          { key: 'password', label: t('authPassword'), autocomplete: 'current-password' },
        ]}
        submitLabel={t('confirm')}
        validate={(values) => (isValidUsername(values.username ?? '') ? null : t('authErrorBadUsername'))}
        onSubmit={async (values) => {
          const result = await api.changeUsername(normalizeUsername(values.username ?? ''), values.password ?? '')
          session.setStatus({ registered: true, username: result.username })
          close()
        }}
        onClose={close}
      />
      <FormDialog
        open={dialog() === 'password'}
        title={t('changePassword')}
        fields={[
          { key: 'current', label: t('authCurrentPassword'), autocomplete: 'current-password' },
          { key: 'next', label: t('authNewPassword'), autocomplete: 'new-password' },
        ]}
        submitLabel={t('confirm')}
        validate={(values) => (isValidPassword(values.next ?? '') ? null : t('authErrorShortPassword'))}
        onSubmit={async (values) => {
          await api.changePassword(values.current ?? '', values.next ?? '')
          close()
        }}
        onClose={close}
      />
      <FormDialog
        open={dialog() === 'recovery'}
        title={t('newRecoveryCode')}
        body={t('newRecoveryCodeBody')}
        fields={[{ key: 'password', label: t('authPassword'), autocomplete: 'current-password' }]}
        submitLabel={t('confirm')}
        onSubmit={async (values) => {
          const result = await api.recoveryCode(values.password ?? '')
          close()
          setNewCode(result.recoveryCode)
        }}
        onClose={close}
      />
      <RecoveryCodeDialog code={newCode()} onDone={() => setNewCode(null)} />
    </>
  )
}
