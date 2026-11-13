import type { JSX } from 'solid-js'

export function Loading(props: { size?: number; class?: string }): JSX.Element {
  const size = () => props.size ?? 56
  return (
    <div role="status" aria-label="Загрузка" class={`grid place-items-center ${props.class ?? ''}`}>
      <div class="morph bg-primary" style={{ width: `${size()}px`, height: `${size()}px` }} />
    </div>
  )
}
