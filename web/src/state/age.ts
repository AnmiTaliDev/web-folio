import { createSignal } from 'solid-js'
import { api, setAgeSource } from '../api/client.ts'
import { session } from './session.ts'

export const AGE_LEVELS = [6, 12, 16, 18] as const
export type AgeLimit = (typeof AGE_LEVELS)[number] | null

const KEY = 'folio.maxAge'

export function parseAge(value: string | null): AgeLimit {
  const number = Number(value)
  return AGE_LEVELS.find((level) => level === number) ?? null
}

function readLocal(): AgeLimit {
  try {
    return parseAge(window.localStorage.getItem(KEY))
  } catch {
    return null
  }
}

function writeLocal(value: AgeLimit): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(KEY)
    } else {
      window.localStorage.setItem(KEY, String(value))
    }
  } catch {
    return
  }
}

const [localAge, setLocalAge] = createSignal<AgeLimit>(readLocal())

export function ageLimit(): AgeLimit {
  if (session.registered()) {
    const saved = session.profile()?.maxAge
    return saved === undefined ? localAge() : parseAge(saved === null ? null : String(saved))
  }
  return localAge()
}

setAgeSource(ageLimit)

export async function setAgeLimit(value: AgeLimit): Promise<void> {
  const profile = session.profile()
  if (session.registered() && profile) {
    const previous = profile
    session.setProfile({ ...profile, maxAge: value })
    try {
      await api.updateProfile({ maxAge: value })
    } catch (error) {
      session.setProfile(previous)
      throw error
    }
    return
  }
  writeLocal(value)
  setLocalAge(value)
}
