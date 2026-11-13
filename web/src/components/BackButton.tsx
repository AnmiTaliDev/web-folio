import { useNavigate } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { t } from '../i18n/index.ts'
import { Icon } from './Icon.tsx'

export function BackButton(): JSX.Element {
  const navigate = useNavigate()
  return (
    <md-icon-button
      aria-label={t('back')}
      class="-ml-3"
      on:click={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
    >
      <Icon name="arrow_back" />
    </md-icon-button>
  )
}
