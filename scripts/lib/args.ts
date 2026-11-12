export type Args = { flags: Set<string>; values: Map<string, string> }

export function parseArgs(argv: string[]): Args {
  const flags = new Set<string>()
  const values = new Map<string, string>()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg?.startsWith('--')) {
      continue
    }
    const name = arg.slice(2)
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      values.set(name, next)
      i++
    } else {
      flags.add(name)
    }
  }
  return { flags, values }
}

export function requireValue(args: Args, name: string): string {
  const value = args.values.get(name)
  if (!value) {
    throw new Error(`Missing required option --${name}`)
  }
  return value
}

export function numberValue(args: Args, name: string, fallback: number): number {
  const value = args.values.get(name)
  return value === undefined ? fallback : Number(value)
}

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }
  return value
}
