import type { JSX } from 'solid-js'

const WAVELENGTH = 24
const PERIODS = 64

const wave = `M0 6 q${WAVELENGTH / 4} -5 ${WAVELENGTH / 2} 0 t${WAVELENGTH / 2} 0${' t12 0'.repeat(PERIODS * 2 - 1)}`

type Props = { value: number; label: string; class?: string; tone?: 'primary' | 'tertiary' }

export function WavyProgress(props: Props): JSX.Element {
  const clamped = () => Math.max(0, Math.min(1, props.value))
  const color = () => (props.tone === 'tertiary' ? 'text-tertiary' : 'text-primary')
  return (
    <div
      role="progressbar"
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped() * 100)}
      class={`relative h-3 w-full ${color()} ${props.class ?? ''}`}
    >
      <div class="absolute inset-y-0 right-0 left-0 flex items-center" aria-hidden="true">
        <div class="h-1 w-full rounded-full bg-current opacity-20" />
      </div>
      <div
        class="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-500"
        style={{ width: `${clamped() * 100}%`, 'transition-timing-function': 'var(--ease-spring)' }}
        aria-hidden="true"
      >
        <svg width={WAVELENGTH * PERIODS} height="12" viewBox={`0 0 ${WAVELENGTH * PERIODS} 12`} class="wave-line max-w-none">
          <path d={wave} fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
        </svg>
      </div>
    </div>
  )
}
