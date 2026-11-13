import type { JSX } from 'solid-js'

type Tone = 'low' | 'container' | 'primary' | 'secondary' | 'tertiary' | 'error'

const tones: Record<Tone, string> = {
  low: 'bg-surface-low text-on-surface',
  container: 'bg-surface-container text-on-surface',
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  error: 'bg-error-container text-on-error-container',
}

type Props = { tone?: Tone; class?: string; children: JSX.Element; role?: 'alert' | 'status' }

export function Panel(props: Props): JSX.Element {
  return (
    <section role={props.role} class={`rounded-panel p-6 ${tones[props.tone ?? 'low']} ${props.class ?? ''}`}>
      {props.children}
    </section>
  )
}
