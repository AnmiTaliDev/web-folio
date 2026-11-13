import { ApiError } from '../shared/errors.ts'

export const CLIENT_KEY_HEADER = 'x-folio-client'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

export function withSecurityHeaders(request: Request, response: Response, isApi: boolean): Response {
  const headers = new Headers(response.headers)
  headers.set('Content-Security-Policy', CSP)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('X-Frame-Options', 'DENY')
  if (request.headers.get('x-forwarded-proto') === 'https') {
    headers.set('Strict-Transport-Security', 'max-age=31536000')
  }
  if (isApi) {
    headers.set('Cache-Control', 'no-store')
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export function assertSameOrigin(request: Request): void {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return
  }
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) {
    return
  }
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw new ApiError(403, 'bad_origin', 'Request origin is not allowed')
  }
  if (originHost !== host) {
    throw new ApiError(403, 'bad_origin', 'Request origin is not allowed')
  }
}

export type RateLimits = { check: (bucket: string, key: string) => void }

export const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  login: { limit: 30, windowMs: 15 * 60 * 1000 },
  recover: { limit: 10, windowMs: 60 * 60 * 1000 },
}

export function createRateLimits(now: () => Date, limits: Record<string, { limit: number; windowMs: number }> = LIMITS): RateLimits {
  const hits = new Map<string, number[]>()
  return {
    check(bucket, key) {
      const rule = limits[bucket]
      if (!rule) {
        return
      }
      const id = `${bucket}:${key}`
      const time = now().getTime()
      const recent = (hits.get(id) ?? []).filter((moment) => moment > time - rule.windowMs)
      if (recent.length >= rule.limit) {
        hits.set(id, recent)
        throw new ApiError(429, 'rate_limited', 'Too many requests, try again later')
      }
      hits.set(id, [...recent, time])
      if (hits.size > 10000) {
        for (const [entry, list] of hits) {
          if (list.every((moment) => moment <= time - 60 * 60 * 1000)) {
            hits.delete(entry)
          }
        }
      }
    },
  }
}

export function clientKey(request: Request): string {
  return request.headers.get(CLIENT_KEY_HEADER) ?? 'unknown'
}
