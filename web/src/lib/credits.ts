import type { Key } from '../i18n/index.ts'

export type Credit = { name: string; url: string; text: Key }

export const CREDITS: readonly Credit[] = [
  { name: 'Material Design', url: 'https://m3.material.io', text: 'creditMaterial' },
  { name: 'Roboto Flex', url: 'https://github.com/TypeNetwork/Roboto-Flex', text: 'creditFont' },
  { name: 'Roboto', url: 'https://github.com/googlefonts/roboto-classic', text: 'creditRoboto' },
  { name: 'Google Sans', url: 'https://github.com/googlefonts/googlesans', text: 'creditGoogleSans' },
  { name: 'Google Sans Flex', url: 'https://github.com/googlefonts/googlesans-flex', text: 'creditGoogleSansFlex' },
  { name: 'SolidJS', url: 'https://www.solidjs.com', text: 'creditSolid' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com', text: 'creditTailwind' },
  { name: 'TensorFlow.js', url: 'https://www.tensorflow.org/js', text: 'creditTf' },
  { name: 'OpenAI SDK', url: 'https://github.com/openai/openai-node', text: 'creditOpenai' },
  { name: 'Zod', url: 'https://zod.dev', text: 'creditZod' },
  { name: 'Node.js, SQLite', url: 'https://nodejs.org', text: 'creditPlatform' },
  { name: 'Vite, Vitest, TypeScript, ESLint', url: 'https://vite.dev', text: 'creditTools' },
  { name: 'Open Library', url: 'https://openlibrary.org', text: 'creditOpenLibrary' },
  { name: 'Creative Commons, FSF', url: 'https://creativecommons.org', text: 'creditLicenses' },
]

export function spdxUrls(license: string): string[] {
  return license
    .split(/\s+(?:AND|OR)\s+/)
    .map((id) => id.replace(/[()]/g, '').trim())
    .filter((id) => /^[A-Za-z0-9.+-]+$/.test(id) && id !== 'UNKNOWN')
    .map((id) => `https://spdx.org/licenses/${id}.html`)
}
