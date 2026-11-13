export const THEMES = [
  'adventure',
  'coming_of_age',
  'family',
  'friendship',
  'love',
  'loneliness',
  'war',
  'power',
  'freedom',
  'justice',
  'morality',
  'religion',
  'society',
  'class',
  'identity',
  'technology',
  'science',
  'nature',
  'survival',
  'death',
  'memory',
  'mind',
  'revenge',
  'humor',
  'politics',
  'history',
  'myth',
  'crime',
] as const

export type Theme = (typeof THEMES)[number]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export const LENGTHS = ['short', 'medium', 'long', 'epic'] as const
