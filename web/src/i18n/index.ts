import { createSignal } from 'solid-js'
import { en, enGenres } from './en.ts'
import { kk, kkGenres } from './kk.ts'
import { ru, ruGenres } from './ru.ts'

export type Key = keyof typeof ru
export type Lang = 'ru' | 'en' | 'kk'

export const LANGS: readonly Lang[] = ['kk', 'ru', 'en']
export const LANG_NAMES: Record<Lang, string> = { kk: 'Қазақша', ru: 'Русский', en: 'English' }

const DICTIONARIES = { ru, en, kk }
const GENRE_LABELS = { ru: ruGenres, en: enGenres, kk: kkGenres }

const STORAGE_KEY = 'folio.lang'

export function detectLang(stored: string | null, navigatorLanguage: string | undefined): Lang {
  const known = LANGS.find((lang) => lang === stored)
  if (known) {
    return known
  }
  const preferred = navigatorLanguage?.toLowerCase() ?? ''
  if (preferred.startsWith('kk')) {
    return 'kk'
  }
  return preferred.startsWith('ru') ? 'ru' : 'en'
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const [lang, setLangSignal] = createSignal<Lang>(detectLang(readStored(), typeof navigator === 'undefined' ? undefined : navigator.language))

function applyDocumentLang(value: Lang): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = value
  }
}

applyDocumentLang(lang())

export { lang }

export function setLang(value: Lang): void {
  setLangSignal(value)
  applyDocumentLang(value)
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    return
  }
}

export function translate(language: Lang, key: Key, params: Record<string, string | number> = {}): string {
  const text = DICTIONARIES[language][key]
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
}

export function t(key: Key, params: Record<string, string | number> = {}): string {
  return translate(lang(), key, params)
}

export const interestGenres = [
  'dystopia',
  'science_fiction',
  'fantasy',
  'mystery',
  'classics',
  'psychology',
  'popular_science',
  'history',
] as const

export function genreLabelIn(language: Lang, key: string): string {
  return GENRE_LABELS[language][key] ?? key
}

export function genreLabel(key: string): string {
  return genreLabelIn(lang(), key)
}

export function reasonText(reason: { type: string; title?: string | null; genres?: string[] }): string {
  switch (reason.type) {
    case 'liked_book':
      return t('reasonLikedBook', { title: reason.title ?? '' })
    case 'genre':
      return t('reasonGenre', { genres: (reason.genres ?? []).map((genre) => genreLabel(genre)).join(', ') })
    case 'similar_readers':
      return t('reasonSimilarReaders')
    default:
      return t('reasonPopular')
  }
}
