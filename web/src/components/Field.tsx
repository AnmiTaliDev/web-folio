import type { JSX } from 'solid-js'

type Props = {
  label: string
  value: string
  onInput: (value: string) => void
  type?: 'text' | 'password'
  error?: string
  autocomplete?: string
  onEnter?: () => void
}

export function Field(props: Props): JSX.Element {
  return (
    <md-outlined-text-field
      label={props.label}
      type={props.type ?? 'text'}
      autocomplete={props.autocomplete}
      prop:value={props.value}
      prop:error={Boolean(props.error)}
      prop:errorText={props.error ?? ''}
      on:input={(event: Event) => props.onInput((event.target as HTMLInputElement).value)}
      on:keydown={(event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          props.onEnter?.()
        }
      }}
    />
  )
}
