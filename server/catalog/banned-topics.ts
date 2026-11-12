export const BANNED_TOPICS = [
  'erotica',
  'erotic',
  'pornography',
  'pornographic',
  'sex',
  'sexual',
  'sexuality',
  'sexually explicit',
  'sadomasochism',
  'bdsm',
  'incest',
  'rape',
  'prostitution',
]

const bannedPattern = new RegExp(`\\b(${BANNED_TOPICS.join('|')})\\b`, 'i')

export function hasBannedTopic(subjects: string[]): boolean {
  return subjects.some((subject) => bannedPattern.test(subject))
}
