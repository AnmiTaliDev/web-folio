import { For, Show, type JSX } from 'solid-js'
import { coverSpec, wrapTitle, type CoverSpec } from '../theme/coverArt.ts'
import { initialsOf } from '../theme/shapes.ts'

type Props = { id: string; title: string; authors?: string[]; size?: number; shape?: 'square' | 'portrait'; showText?: boolean; class?: string }

function Motif(props: { spec: CoverSpec }): JSX.Element {
  const { spec } = props
  const fg = spec.palette.foreground
  const accent = spec.palette.accent
  switch (spec.motif) {
    case 'arcs':
      return (
        <g fill="none" stroke={fg} stroke-width="14" opacity="0.22">
          <For each={[60, 105, 150, 195, 240]}>{(radius) => <circle cx={60 + spec.a * 80} cy={300 + spec.b * 30} r={radius} />}</For>
        </g>
      )
    case 'stripes':
      return (
        <g transform={`rotate(${-25 + spec.a * 20} 100 150)`} fill={fg} opacity="0.2">
          <For each={[0, 1, 2, 3, 4, 5, 6]}>{(index) => <rect x="-60" y={20 + index * 46} width="320" height={12 + (index % 3) * 8} />}</For>
        </g>
      )
    case 'dots':
      return (
        <g fill={fg} opacity="0.25">
          <For each={Array.from({ length: 35 }, (_, index) => index)}>
            {(index) => <circle cx={30 + (index % 5) * 35} cy={120 + Math.floor(index / 5) * 25} r={3 + ((index * 7 + Math.floor(spec.c * 10)) % 5)} />}
          </For>
        </g>
      )
    case 'waves':
      return (
        <g fill="none" stroke={fg} stroke-width="6" stroke-linecap="round" opacity="0.28">
          <For each={[0, 1, 2, 3, 4, 5]}>
            {(index) => <path d={`M-10 ${150 + index * 24} q 30 ${-18 - spec.a * 14} 60 0 t 60 0 t 60 0 t 60 0 t 60 0`} />}
          </For>
        </g>
      )
    case 'skyline':
      return (
        <g fill={fg} opacity="0.24">
          <For each={[0, 1, 2, 3, 4]}>
            {(index) => <rect x={index * 40} y={300 - (60 + ((index * 37 + Math.floor(spec.a * 100)) % 110))} width="36" height="260" />}
          </For>
        </g>
      )
    default:
      return (
        <g>
          <circle cx={70 + spec.a * 60} cy={190 + spec.b * 20} r={46 + spec.c * 18} fill={accent} opacity="0.55" />
          <rect x="0" y="245" width="200" height="55" fill={fg} opacity="0.18" />
        </g>
      )
  }
}

export function Cover(props: Props): JSX.Element {
  const size = () => props.size ?? 64
  const portrait = () => props.shape === 'portrait'
  const spec = () => coverSpec(props.id)
  return (
    <Show
      when={portrait()}
      fallback={
        <div
          aria-hidden="true"
          class={`grid shrink-0 place-items-center ${props.class ?? ''}`}
          style={{
            width: `${size()}px`,
            height: `${size()}px`,
            'border-radius': `${Math.round(size() * 0.28)}px`,
            'font-size': `${Math.round(size() * 0.32)}px`,
            background: spec().palette.background,
            color: spec().palette.foreground,
          }}
        >
          <span class="headline">{initialsOf(props.title)}</span>
        </div>
      }
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 200 300"
        class={`shrink-0 shadow-sm ${props.class ?? ''}`}
        style={{ width: `${size()}px`, height: `${Math.round(size() * 1.5)}px`, 'border-radius': `${Math.max(Math.round(size() * 0.08), 4)}px` }}
      >
        <rect width="200" height="300" fill={spec().palette.background} />
        <Motif spec={spec()} />
        <rect x="0" y="0" width="10" height="300" fill={spec().palette.foreground} opacity="0.18" />
        <Show
          when={props.showText}
          fallback={
            <text x="100" y="62" text-anchor="middle" font-size="44" font-weight="800" fill={spec().palette.foreground} style={{ 'font-family': 'var(--font-covers)', 'font-variation-settings': 'var(--fv-covers)' }}>
              {initialsOf(props.title)}
            </text>
          }
        >
          <For each={wrapTitle(props.title)}>
            {(line, index) => (
              <text x="26" y={52 + index() * 28} font-size="24" font-weight="800" fill={spec().palette.foreground} style={{ 'font-family': 'var(--font-covers)', 'font-variation-settings': 'var(--fv-covers)' }}>
                {line}
              </text>
            )}
          </For>
          <Show when={props.authors && props.authors.length > 0}>
            <text x="26" y="284" font-size="13" font-weight="600" fill={spec().palette.foreground} style={{ 'font-family': 'var(--font-covers)', 'font-variation-settings': 'var(--fv-covers)' }}>
              {(props.authors ?? []).join(', ').slice(0, 26)}
            </text>
          </Show>
        </Show>
      </svg>
    </Show>
  )
}
