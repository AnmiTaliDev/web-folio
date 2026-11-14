import { readFileSync } from 'node:fs'

const PLACEHOLDER = '{{rules}}'

function readPrompt(name: string): string {
  return readFileSync(new URL(`../../prompts/${name}.txt`, import.meta.url), 'utf8').trim()
}

const rules = readPrompt('rules')

export const SELECT_SYSTEM_PROMPT = readPrompt('select').replace(PLACEHOLDER, rules)
export const ANSWER_SYSTEM_PROMPT = readPrompt('answer').replace(PLACEHOLDER, rules)
export const DESCRIPTION_SYSTEM_PROMPT = readPrompt('description')
