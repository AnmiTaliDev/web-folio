import { GENRE_KEYS } from './genre-map.ts'
import { DIFFICULTIES, LENGTHS, THEMES } from './themes.ts'

type FeatureSource = {
  genres: readonly string[]
  themes: readonly string[]
  difficulty: string
  length: string
  year: number
  original: string
}

const ERA_BOUNDS = [1800, 1900, 1950, 1990] as const
const ORIGINALS = ['ru', 'en'] as const

export const FEATURE_DIM = GENRE_KEYS.length + THEMES.length + DIFFICULTIES.length + LENGTHS.length + (ERA_BOUNDS.length + 1) + ORIGINALS.length

const GENRE_WEIGHT = 1
const THEME_WEIGHT = 1
const MINOR_WEIGHT = 0.5

function eraIndex(year: number): number {
  const index = ERA_BOUNDS.findIndex((bound) => year < bound)
  return index === -1 ? ERA_BOUNDS.length : index
}

export function featureEmbedding(book: FeatureSource): number[] {
  const vector = new Array<number>(FEATURE_DIM).fill(0)
  let offset = 0
  GENRE_KEYS.forEach((genre, index) => {
    if (book.genres.includes(genre)) {
      vector[offset + index] = GENRE_WEIGHT
    }
  })
  offset += GENRE_KEYS.length
  THEMES.forEach((theme, index) => {
    if (book.themes.includes(theme)) {
      vector[offset + index] = THEME_WEIGHT
    }
  })
  offset += THEMES.length
  const difficulty = DIFFICULTIES.findIndex((value) => value === book.difficulty)
  if (difficulty >= 0) {
    vector[offset + difficulty] = MINOR_WEIGHT
  }
  offset += DIFFICULTIES.length
  const length = LENGTHS.findIndex((value) => value === book.length)
  if (length >= 0) {
    vector[offset + length] = MINOR_WEIGHT
  }
  offset += LENGTHS.length
  vector[offset + eraIndex(book.year)] = MINOR_WEIGHT
  offset += ERA_BOUNDS.length + 1
  const original = ORIGINALS.findIndex((value) => value === book.original)
  if (original >= 0) {
    vector[offset + original] = MINOR_WEIGHT
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  return norm === 0 ? vector : vector.map((value) => value / norm)
}
