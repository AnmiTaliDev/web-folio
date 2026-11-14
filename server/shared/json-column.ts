import { z } from 'zod'

const stringList = z.array(z.string())

export function parseStringList(raw: string): string[] {
  return stringList.parse(JSON.parse(raw))
}
