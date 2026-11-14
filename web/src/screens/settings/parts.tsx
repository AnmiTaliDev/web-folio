import { Show, type JSX } from 'solid-js'
import { Icon } from '../../components/Icon.tsx'
import type { IconName } from '../../components/icons.ts'
import { t, type Key } from '../../i18n/index.ts'

export function Row(props: { icon: IconName; label: string; hint?: string; danger?: boolean; onClick: () => void }): JSX.Element {
  return (
    <li>
      <button
        type="button"
        class={`press relative flex w-full items-center gap-4 rounded-3xl px-4 py-3.5 text-left ${props.danger ? 'text-error' : 'text-on-surface'} hover:bg-surface-high`}
        onClick={() => props.onClick()}
      >
        <md-ripple />
        <Icon name={props.icon} />
        <span class="flex flex-col">
          <span class="title">{props.label}</span>
          <Show when={props.hint}>
            <span class="text-sm text-on-surface-variant">{props.hint}</span>
          </Show>
        </span>
      </button>
    </li>
  )
}

export function Toggle(props: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }): JSX.Element {
  return (
    <li class="flex items-center justify-between gap-4 rounded-3xl px-4 py-3.5">
      <span class="flex flex-col">
        <span class="title">{props.label}</span>
        <span class="text-sm text-on-surface-variant">{props.hint}</span>
      </span>
      <md-switch
        aria-label={props.label}
        prop:selected={props.checked}
        prop:disabled={props.disabled === true}
        on:change={(event: Event) => props.onChange((event.target as HTMLInputElement & { selected: boolean }).selected)}
      />
    </li>
  )
}

export function Group(props: { children: JSX.Element }): JSX.Element {
  return <ul class="flex flex-col rounded-panel bg-surface-low p-2">{props.children}</ul>
}

export function ChoiceRow(props: { title: Key; children: JSX.Element }): JSX.Element {
  return (
    <div class="flex flex-col gap-2">
      <h4 class="label text-on-surface-variant">{t(props.title)}</h4>
      {props.children}
    </div>
  )
}
