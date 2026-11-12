export const SESSION_COOKIE = 'folio_session'
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SESSION_COOKIE) {
      return rest.join('=') || null
    }
  }
  return null
}

function isSecure(request: Request): boolean {
  return request.headers.get('x-forwarded-proto') === 'https'
}

export function sessionCookie(request: Request, token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ONE_YEAR_SECONDS}${isSecure(request) ? '; Secure' : ''}`
}

export function clearedSessionCookie(request: Request): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${isSecure(request) ? '; Secure' : ''}`
}
