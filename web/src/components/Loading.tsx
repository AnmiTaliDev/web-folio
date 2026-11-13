import type { JSX } from 'solid-js'
import { t } from '../i18n/index.ts'

export function Loading(props: { size?: number; class?: string }): JSX.Element {
  const size = () => props.size ?? 56
  return (
    <div role="status" aria-label={t('loading')} class={`grid place-items-center ${props.class ?? ''}`}>
      <div class="morph bg-primary" style={{ width: `${size()}px`, height: `${size()}px` }} />
    </div>
  )
}
