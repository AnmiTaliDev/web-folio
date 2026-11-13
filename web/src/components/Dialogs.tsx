import { createSignal, createEffect, Show, type JSX } from 'solid-js'
import { t } from '../i18n/ru.ts'
import { authErrorText } from '../lib/auth.ts'
import { Dialog } from './Dialog.tsx'
import { Field } from './Field.tsx'
import { Icon } from './Icon.tsx'

type FieldSpec = { key: string; label: string; autocomplete: string }

type FormProps = {
  open: boolean
  title: string
  body?: string
  fields: FieldSpec[]
  submitLabel: string
  danger?: boolean
  validate?: (values: Record<string, string>) => string | null
  onSubmit: (values: Record<string, string>) => Promise<void>
  onClose: () => void
}

export function FormDialog(props: FormProps): JSX.Element {
  const [values, setValues] = createSignal<Record<string, string>>({})
  const [error, setError] = createSignal<string | null>(null)
  const [busy, setBusy] = createSignal(false)

  createEffect(() => {
    if (props.open) {
      setValues({})
      setError(null)
    }
  })

  async function submit(): Promise<void> {
    if (busy()) {
      return
    }
    const invalid = props.validate?.(values()) ?? null
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await props.onSubmit(values())
    } catch (failure) {
      setError(authErrorText(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={props.open}
      title={props.title}
      onClose={props.onClose}
      actions={
        <>
          <md-text-button on:click={() => props.onClose()}>{t('cancel')}</md-text-button>
          <md-filled-button
            prop:disabled={busy()}
            style={props.danger ? { '--md-filled-button-container-color': 'var(--color-error)', '--md-filled-button-label-text-color': 'var(--color-on-error)' } : {}}
            on:click={() => void submit()}
          >
            {props.submitLabel}
          </md-filled-button>
        </>
      }
    >
      <div class="flex flex-col gap-4">
        <Show when={props.body}>
          <p>{props.body}</p>
        </Show>
        {props.fields.map((field) => (
          <Field
            label={field.label}
            type="password"
            autocomplete={field.autocomplete}
            value={values()[field.key] ?? ''}
            onInput={(value) => setValues({ ...values(), [field.key]: value })}
            onEnter={() => void submit()}
          />
        ))}
        <Show when={error()}>
          <p role="alert" class="text-error">
            {error()}
          </p>
        </Show>
      </div>
    </Dialog>
  )
}

export function RecoveryCodeDialog(props: { code: string | null; onDone: () => void }): JSX.Element {
  const [copied, setCopied] = createSignal(false)
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(props.code ?? '')
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Dialog
      open={props.code !== null}
      title={t('recoveryCodeTitle')}
      onClose={() => undefined}
      actions={
        <>
          <md-text-button on:click={() => void copy()}>
            <Icon slot="icon" name="content_copy" size={18} />
            {copied() ? t('saved') : t('copy')}
          </md-text-button>
          <md-filled-button on:click={() => props.onDone()}>{t('recoveryCodeSaved')}</md-filled-button>
        </>
      }
    >
      <p class="mb-4">{t('recoveryCodeBody')}</p>
      <p class="headline rounded-2xl bg-surface-highest px-4 py-3 text-center font-mono text-xl tracking-widest break-all text-on-surface select-all">
        {props.code}
      </p>
    </Dialog>
  )
}

export function ExportDialog(props: { open: boolean; text: string; onClose: () => void }): JSX.Element {
  const [copied, setCopied] = createSignal(false)
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(props.text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  createEffect(() => {
    if (props.open) {
      setCopied(false)
    }
  })
  return (
    <Dialog
      open={props.open}
      title={t('exportTitle')}
      onClose={props.onClose}
      actions={
        <>
          <md-text-button on:click={() => void copy()}>{copied() ? t('saved') : t('copy')}</md-text-button>
          <md-filled-button on:click={() => props.onClose()}>{t('close')}</md-filled-button>
        </>
      }
    >
      <p class="mb-3 text-sm">{t('exportHint')}</p>
      <pre class="max-h-72 overflow-auto rounded-2xl bg-surface-highest p-4 text-xs leading-relaxed text-on-surface">{props.text}</pre>
    </Dialog>
  )
}
