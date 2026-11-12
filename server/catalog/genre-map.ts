export const GENRE_KEYS = [
  'dystopia',
  'science_fiction',
  'fantasy',
  'mystery',
  'classics',
  'psychology',
  'popular_science',
  'history',
] as const

export type GenreKey = (typeof GENRE_KEYS)[number]

type SubjectRule = { includes: string[]; exact: string[] }

export const GENRE_RULES: Record<GenreKey, SubjectRule> = {
  dystopia: { includes: ['dystopia', 'totalitarian'], exact: [] },
  science_fiction: { includes: ['science fiction', 'sci-fi', 'cyberpunk', 'space opera', 'time travel'], exact: ['fiction, science fiction'] },
  fantasy: { includes: ['fantasy', 'wizard', 'dragons', 'magic'], exact: [] },
  mystery: { includes: ['mystery', 'detective', 'thriller', 'crime fiction', 'murder'], exact: ['crime', 'suspense'] },
  classics: { includes: ['classic'], exact: ['russian literature', 'english literature', 'american literature', 'french literature', 'german literature'] },
  psychology: { includes: ['psychology', 'psychoanalysis', 'cognitive', 'mental health'], exact: ['psychiatry'] },
  popular_science: {
    includes: ['popular science', 'popular works'],
    exact: ['science', 'physics', 'cosmology', 'astronomy', 'evolution', 'mathematics', 'neuroscience', 'genetics'],
  },
  history: { includes: ['history'], exact: ['world war', 'middle ages', 'ancient history'] },
}

export function subjectsToGenres(subjects: string[]): GenreKey[] {
  const normalized = subjects.map((subject) => subject.trim().toLowerCase())
  return GENRE_KEYS.filter((key) => {
    const rule = GENRE_RULES[key]
    return normalized.some((subject) => rule.exact.includes(subject) || rule.includes.some((fragment) => subject.includes(fragment)))
  })
}
