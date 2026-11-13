import type { JSX } from 'solid-js'
import { initialsOf, shapeFor, toneFor } from '../theme/shapes.ts'

const tones = [
  'bg-primary-container text-on-primary-container',
  'bg-tertiary-container text-on-tertiary-container',
  'bg-secondary-container text-on-secondary-container',
] as const

type Props = { id: string; title: string; size?: number; class?: string }

export function Cover(props: Props): JSX.Element {
  const size = () => props.size ?? 64
  return (
    <div
      aria-hidden="true"
      class={`grid shrink-0 place-items-center ${tones[toneFor(props.id)]} ${props.class ?? ''}`}
      style={{
        width: `${size()}px`,
        height: `${size()}px`,
        'clip-path': `url(#clip-${shapeFor(props.id)})`,
        'font-size': `${Math.round(size() * 0.32)}px`,
      }}
    >
      <span class="headline">{initialsOf(props.title)}</span>
    </div>
  )
}
