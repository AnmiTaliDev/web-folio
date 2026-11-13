import { lang } from '../i18n/index.ts'
import { readSse } from './sse.ts'
import type { AuthStatus, Book, RatedEntry, SessionInfo, ShelfEntry, ShelfStatus, BookOfDay, ChatEvent, Explanation, Profile, Recommendation, Taste } from './types.ts'

let ageSource: () => number | null = () => null

export function setAgeSource(source: () => number | null): void {
  ageSource = source
}

function ageHeaders(): Record<string, string> {
  const age = ageSource()
  return age === null ? {} : { 'X-Max-Age': String(age) }
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal }

async function failure(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
  return new ApiError(response.status, body?.error?.code ?? 'network_error', body?.error?.message ?? response.statusText)
}

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: { 'Accept-Language': lang(), ...ageHeaders(), ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? null,
    })
  } catch {
    throw new ApiError(0, 'network_error', 'Network error')
  }
  if (!response.ok) {
    throw await failure(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export const api = {
  authStatus: () => request<AuthStatus>('/api/auth/me'),
  register: (username: string, password: string) =>
    request<{ username: string; recoveryCode: string }>('/api/auth/register', { method: 'POST', body: { username, password, acceptTerms: true } }),
  login: (username: string, password: string) => request<{ username: string }>('/api/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  account: () =>
    request<{ username: string; createdAt: string; termsVersion: string | null; termsAcceptedAt: string | null; currentTermsVersion: string }>('/api/auth/account'),
  acceptTerms: () => request<{ termsVersion: string }>('/api/auth/terms', { method: 'POST', body: { acceptTerms: true } }),
  changeUsername: (username: string, password: string) =>
    request<{ username: string }>('/api/auth/username', { method: 'POST', body: { username, password } }),
  sessions: async () => (await request<{ sessions: SessionInfo[] }>('/api/auth/sessions')).sessions,
  revokeSession: (id: string) => request<void>(`/api/auth/sessions/${id}`, { method: 'DELETE' }),
  chatHistory: async () =>
    (await request<{ messages: { id: string; role: 'user' | 'assistant'; text: string; createdAt: string; books: Book[] }[] }>('/api/chat/history')).messages,
  clearChatHistory: () => request<void>('/api/chat/history', { method: 'DELETE' }),
  logoutAll: () => request<void>('/api/auth/logout-all', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),
  recoveryCode: (password: string) => request<{ recoveryCode: string }>('/api/auth/recovery-code', { method: 'POST', body: { password } }),
  recover: (username: string, recoveryCode: string, newPassword: string) =>
    request<{ username: string; recoveryCode: string }>('/api/auth/recover', { method: 'POST', body: { username, recoveryCode, newPassword } }),
  exportData: () => request<unknown>('/api/me/export'),
  deleteAccount: (password: string) => request<void>('/api/me', { method: 'DELETE', body: { password } }),

  capabilities: () => request<{ ai: boolean }>('/api/capabilities'),
  search: (query: string, signal?: AbortSignal) => request<Book[]>(`/api/books/search?q=${encodeURIComponent(query)}`, { signal: signal ?? undefined }),
  popular: (interests: string[] = [], limit = 12) =>
    request<Book[]>(`/api/books/popular?interests=${encodeURIComponent(interests.join(','))}&limit=${limit}`),
  similar: (id: string) => request<Book[]>(`/api/books/${id}/similar`),
  browse: (options: { genre: string; query: string; sort: string; offset: number; limit?: number; theme?: string }) => {
    const params = new URLSearchParams({
      genre: options.genre,
      q: options.query,
      sort: options.sort,
      offset: String(options.offset),
      limit: String(options.limit ?? 24),
      theme: options.theme ?? '',
    })
    return request<{ books: Book[]; total: number }>(`/api/books/browse?${params.toString()}`)
  },
  book: (id: string) => request<Book>(`/api/books/${id}`),
  recommendations: () => request<Recommendation[]>('/api/recommendations'),
  explain: (id: string) => request<Explanation>(`/api/books/${id}/explain`),
  bookOfDay: async (day: string): Promise<BookOfDay | null> => {
    try {
      return await request<BookOfDay>(`/api/book-of-day?day=${day}`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  },
  taste: () => request<Taste>('/api/taste'),

  profile: async (): Promise<Profile | null> => (await request<{ profile: Profile | null }>('/api/profile')).profile,
  saveProfile: (interests: string[], consent: boolean) => request<void>('/api/profile', { method: 'PUT', body: { interests, consent } }),
  updateProfile: (flags: Partial<Pick<Profile, 'personalizationEnabled' | 'aiDescriptionsEnabled' | 'maxAge'>>) =>
    request<void>('/api/profile', { method: 'PATCH', body: flags }),

  ratings: async (): Promise<Record<string, number>> => (await request<{ ratings: Record<string, number> }>('/api/ratings')).ratings,
  rate: (bookId: string, value: 1 | -1, isRead = false) => request<void>(`/api/ratings/${bookId}`, { method: 'PUT', body: { value, isRead } }),
  unrate: (bookId: string) => request<void>(`/api/ratings/${bookId}`, { method: 'DELETE' }),
  shelf: async () => (await request<{ items: ShelfEntry[] }>('/api/shelf')).items,
  setShelf: (bookId: string, status: ShelfStatus) => request<void>(`/api/shelf/${bookId}`, { method: 'PUT', body: { status } }),
  clearShelf: (bookId: string) => request<void>(`/api/shelf/${bookId}`, { method: 'DELETE' }),
  ratedBooks: async () => (await request<{ items: RatedEntry[] }>('/api/ratings/books')).items,
}

export async function* chatStream(message: string, signal?: AbortSignal): AsyncGenerator<ChatEvent> {
  let response: Response
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': lang() },
      body: JSON.stringify({ message }),
      signal: signal ?? null,
    })
  } catch {
    throw new ApiError(0, 'network_error', 'Network error')
  }
  if (!response.ok || !response.body) {
    throw await failure(response)
  }
  for await (const frame of readSse(response.body)) {
    yield { event: frame.event, data: JSON.parse(frame.data) } as ChatEvent
  }
}
