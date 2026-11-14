import type { JSX } from 'solid-js'
import { Icon } from '../../components/Icon.tsx'
import { Panel } from '../../components/Panel.tsx'
import { t, type Key } from '../../i18n/index.ts'
import { appearance, CONTRASTS, DENSITIES, MODES, MOTIONS, parseSeed, PRESET_SEEDS, SCALES, SHAPES, VARIANTS } from '../../state/appearance.ts'
import { FontSettings } from './FontSettings.tsx'
import { ChoiceRow, Choices, Toggle } from './parts.tsx'

const modeLabels = { system: 'modeSystem', light: 'modeLight', dark: 'modeDark' } as const
const variantLabels = { vibrant: 'styleVibrant', tonal: 'styleTonal', neutral: 'styleNeutral', expressive: 'styleExpressive', content: 'styleContent' } as const
const contrastLabels: Record<number, Key> = { 0: 'contrastStandard', 0.5: 'contrastMedium', 1: 'contrastHigh' }
const scaleLabels: Record<number, Key> = { 0.9: 'scaleSmall', 1: 'scaleStandard', 1.15: 'scaleLarge', 1.3: 'scaleXLarge' }
const densityLabels = { compact: 'densityCompact', comfortable: 'densityComfortable', spacious: 'densitySpacious' } as const
const shapeLabels = { sharp: 'shapeSharp', medium: 'shapeMedium', soft: 'shapeSoft' } as const
const motionLabels = { system: 'motionSystem', reduced: 'motionReduced', full: 'motionFull' } as const
const presetLabels: Record<string, Key> = {
  blue: 'colorBlue',
  teal: 'colorTeal',
  green: 'colorGreen',
  olive: 'colorOlive',
  orange: 'colorOrange',
  red: 'colorRed',
  pink: 'colorPink',
  purple: 'colorPurple',
  indigo: 'colorIndigo',
  brown: 'colorBrown',
  slate: 'colorSlate',
}

function Swatch(props: { label: string; background: string; selected: boolean; onSelect: () => void; children?: JSX.Element }): JSX.Element {
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={props.selected}
        aria-label={props.label}
        title={props.label}
        class={`press relative grid size-12 place-items-center rounded-full text-white outline-offset-2 ${props.selected ? 'ring-4 ring-primary ring-offset-2 ring-offset-surface-low' : 'ring-1 ring-outline-variant'}`}
        style={{ background: props.background }}
        onClick={() => props.onSelect()}
      >
        {props.selected ? <Icon name="check" /> : props.children}
      </button>
    </li>
  )
}

export function AppearanceCard(): JSX.Element {
  const current = () => appearance.value()
  return (
    <div class="flex flex-col gap-4">
      <Panel tone="low" class="flex flex-col gap-6">
        <ChoiceRow title="appearanceMode">
          <ul class="flex flex-wrap gap-2" role="radiogroup" aria-label={t('appearanceMode')}>
            {MODES.map((mode) => (
              <li>
                <md-filter-chip label={t(modeLabels[mode])} prop:selected={current().mode === mode} on:click={() => appearance.update({ mode })} />
              </li>
            ))}
          </ul>
        </ChoiceRow>
        <ChoiceRow title="appearanceColor">
          <ul class="flex flex-wrap gap-3" role="radiogroup" aria-label={t('appearanceColor')}>
            <Swatch
              label={t('colorFolio')}
              background="linear-gradient(135deg, #0061A4 50%, #C4524A 50%)"
              selected={current().seed === null}
              onSelect={() => appearance.update({ seed: null })}
            />
            {PRESET_SEEDS.map((preset) => (
              <Swatch
                label={t(presetLabels[preset.id] ?? 'colorFolio')}
                background={preset.hex}
                selected={current().seed === preset.hex.toUpperCase()}
                onSelect={() => appearance.update({ seed: preset.hex.toUpperCase() })}
              />
            ))}
            <li>
              <label
                class="press relative grid size-12 cursor-pointer place-items-center overflow-hidden rounded-full ring-1 ring-outline-variant"
                style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                title={t('colorCustom')}
              >
                <span class="sr-only">{t('colorCustom')}</span>
                <input
                  type="color"
                  class="absolute inset-0 size-full cursor-pointer opacity-0"
                  value={current().seed ?? '#0061A4'}
                  aria-label={t('colorCustom')}
                  onInput={(event) => {
                    const seed = parseSeed(event.currentTarget.value)
                    if (seed) {
                      appearance.update({ seed })
                    }
                  }}
                />
              </label>
            </li>
          </ul>
        </ChoiceRow>
        <ChoiceRow title="appearanceStyle">
          <ul class="flex flex-wrap gap-2" role="radiogroup" aria-label={t('appearanceStyle')}>
            {VARIANTS.map((variant) => (
              <li>
                <md-filter-chip label={t(variantLabels[variant])} prop:selected={current().variant === variant} on:click={() => appearance.update({ variant })} />
              </li>
            ))}
          </ul>
        </ChoiceRow>
        <ChoiceRow title="appearanceContrast">
          <ul class="flex flex-wrap gap-2" role="radiogroup" aria-label={t('appearanceContrast')}>
            {CONTRASTS.map((contrast) => (
              <li>
                <md-filter-chip label={t(contrastLabels[contrast] ?? 'contrastStandard')} prop:selected={current().contrast === contrast} on:click={() => appearance.update({ contrast })} />
              </li>
            ))}
          </ul>
        </ChoiceRow>
        <ul class="-mx-4">
          <Toggle label={t('appearanceAmoled')} hint={t('appearanceAmoledHint')} checked={current().amoled} onChange={(amoled) => appearance.update({ amoled })} />
        </ul>
      </Panel>
      <Panel tone="low" class="flex flex-col gap-6">
        <Choices title="appearanceTextSize" options={SCALES} label={(option) => scaleLabels[option] ?? 'scaleStandard'} selected={current().scale} onSelect={(scale) => appearance.update({ scale })} />
        <Choices title="appearanceDensity" options={DENSITIES} label={(option) => densityLabels[option]} selected={current().density} onSelect={(density) => appearance.update({ density })} />
        <Choices title="appearanceShape" options={SHAPES} label={(option) => shapeLabels[option]} selected={current().shape} onSelect={(shape) => appearance.update({ shape })} />
        <FontSettings />
        <Choices title="appearanceMotion" options={MOTIONS} label={(option) => motionLabels[option]} selected={current().motion} onSelect={(motion) => appearance.update({ motion })} />
        <div class="flex flex-col gap-3">
          <p class="text-sm text-on-surface-variant">{t('appearanceNote')}</p>
          <div>
            <md-text-button on:click={() => appearance.reset()}>
              <Icon slot="icon" name="restart_alt" size={18} />
              {t('appearanceReset')}
            </md-text-button>
          </div>
        </div>
      </Panel>
    </div>
  )
}
